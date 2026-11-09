<?php

namespace Tests\Feature;

use App\Console\Commands\AlertUnconfirmedOrders;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AlertUnconfirmedOrdersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.ntfy.url' => 'https://ntfy.example',
            'services.ntfy.topic' => 'osu-test-topic',
            'services.ntfy.token' => '',
        ]);

        Http::fake(['ntfy.example*' => Http::response(['id' => 'msg1'])]);
    }

    private function order(OrderStatus $status = OrderStatus::Placed): Order
    {
        return Order::create([
            'status' => $status,
            'payment_method' => 'cash',
            'contact_name' => 'Ion Popescu',
            'contact_phone' => '0712345678',
            'contact_email' => 'ion@example.test',
            'delivery_type' => 'ridicare',
            'items' => [],
            'total' => 2500,
            'placed_at' => $status === OrderStatus::PendingPayment ? null : now(),
        ])->refresh();
    }

    public function test_it_does_not_alert_inside_the_grace_period(): void
    {
        $this->order();
        $this->travel(4)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_it_alerts_once_for_all_waiting_orders_then_waits_out_the_window(): void
    {
        $first = $this->order();
        $second = $this->order();
        $this->travel(6)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();
        $this->travel(1)->minutes();
        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://ntfy.example'
            && $request['topic'] === 'osu-test-topic'
            && $request['title'] === AlertUnconfirmedOrders::TITLE
            && $request['priority'] === 5
            && str_ends_with($request['click'], '/dashboard/comenzi')
            && $request['message'] === "2 comenzi așteaptă să fie acceptate: {$first->number}, {$second->number}"
            && ! $request->hasHeader('Authorization'));
    }

    public function test_the_title_matches_what_the_phone_automation_expects(): void
    {
        $this->assertSame('Comandă neacceptată', AlertUnconfirmedOrders::TITLE);
    }

    public function test_it_carries_order_numbers_only(): void
    {
        $this->order();
        $this->travel(6)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertSent(fn (Request $request) => ! str_contains($request->body(), 'Ion Popescu')
            && ! str_contains($request->body(), '0712345678')
            && ! str_contains($request->body(), 'ion@example.test'));
    }

    public function test_it_authenticates_when_a_token_is_configured(): void
    {
        config(['services.ntfy.token' => 'tk_secret']);
        $this->order();
        $this->travel(6)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer tk_secret'));
    }

    public function test_it_keeps_alerting_until_the_order_is_accepted(): void
    {
        $order = $this->order();
        $this->travel(6)->minutes();
        $this->artisan('orders:alert-unconfirmed');

        $this->travel(6)->minutes();
        $this->artisan('orders:alert-unconfirmed');
        Http::assertSentCount(2);

        $order->update(['status' => OrderStatus::Accepted]);
        $this->travel(6)->minutes();
        $this->artisan('orders:alert-unconfirmed');

        Http::assertSentCount(2);
    }

    public function test_it_ignores_accepted_orders_and_unpaid_card_orders(): void
    {
        $this->order(OrderStatus::Accepted);
        $this->order(OrderStatus::PendingPayment);
        $this->travel(10)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_it_stays_silent_without_a_topic(): void
    {
        config(['services.ntfy.topic' => '']);
        $this->order();
        $this->travel(10)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_it_retries_on_the_next_sweep_when_ntfy_refuses(): void
    {
        Http::swap(new Factory);
        Http::fake(['ntfy.example*' => Http::sequence()
            ->push(['error' => 'nope'], 429)
            ->push(['id' => 'msg2'])]);
        $this->order();
        $this->travel(6)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertFailed();
        $this->travel(1)->minutes();
        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertSentCount(2);
    }

    public function test_it_retries_on_the_next_sweep_when_ntfy_is_unreachable(): void
    {
        Http::swap(new Factory);
        Http::fake(['ntfy.example*' => Http::sequence()
            ->pushFailedConnection()
            ->push(['id' => 'msg3'])]);
        $this->order();
        $this->travel(6)->minutes();

        $this->artisan('orders:alert-unconfirmed')->assertFailed();
        $this->travel(1)->minutes();
        $this->artisan('orders:alert-unconfirmed')->assertSuccessful();

        Http::assertSentCount(2);
    }
}
