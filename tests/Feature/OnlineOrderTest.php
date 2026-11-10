<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Http\Controllers\CheckoutController;
use App\Mail\CustomerOrderCancelledMail;
use App\Mail\CustomerOrderConfirmationMail;
use App\Mail\RestaurantOrderPlacedMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\RecaptchaVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;
use Tests\TestCase;

class OnlineOrderTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<array{method: string, url: string, params: array, headers: array}> */
    private array $stripeRequests = [];

    /** A fixed body, or a closure from the request URL to one. */
    private array|\Closure $stripeResponse = [];

    public int $stripeStatus = 200;

    protected function setUp(): void
    {
        parent::setUp();

        // tests must never reach the real Stripe account from a developer's .env
        config([
            'services.stripe.secret' => 'sk_test_fake',
            'ordering.notification_email' => 'comenzi@osu.test',
        ]);
        Mail::fake();

        $test = $this;
        ApiRequestor::setHttpClient(new class($test) implements ClientInterface
        {
            public function __construct(private OnlineOrderTest $test) {}

            public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null)
            {
                $body = $this->test->recordStripeRequest($method, $absUrl, $params, $headers);

                return [json_encode($body), $this->test->stripeStatus, []];
            }
        });
    }

    protected function tearDown(): void
    {
        ApiRequestor::setHttpClient(null);

        parent::tearDown();
    }

    public function recordStripeRequest(string $method, string $url, array $params, array $headers = []): array
    {
        $this->stripeRequests[] = compact('method', 'url', 'params', 'headers');

        return $this->stripeResponse instanceof \Closure
            ? ($this->stripeResponse)($url)
            : $this->stripeResponse;
    }

    private function product(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Kurtos Test',
            'slug' => 'kurtos-test',
            'category' => 'Kurtos',
            'price' => 2000,
            'is_active' => true,
        ], $attrs));
    }

    private function payload(Product $product, array $orderData = [], string $option = '-', int $quantity = 1): array
    {
        return [
            'items' => [['product_id' => (string) $product->id, 'option' => $option, 'quantity' => $quantity]],
            'orderData' => array_merge([
                'name' => 'Ion Popescu',
                'phone' => '0712345678',
                'email' => 'ion@example.test',
                'deliveryType' => 'livrare',
                'street' => 'Str. Lungă 1',
                'city' => 'Brașov',
                'scheduledTime' => 'Cât mai curând',
            ], $orderData),
        ];
    }

    private function fakeCaptcha(bool $success): void
    {
        config(['services.recaptcha.secret' => 'captcha-secret']);
        Http::fake(['www.google.com/recaptcha/*' => Http::response(['success' => $success])]);
    }

    private function placedOrder(): Order
    {
        return Order::create([
            'status' => OrderStatus::Placed,
            'payment_method' => 'cash',
            'contact_name' => 'Ion Popescu',
            'contact_phone' => '0712345678',
            'contact_email' => 'ion@example.test',
            'delivery_type' => 'ridicare',
            'items' => [],
            'total' => 2500,
            'placed_at' => now(),
        ]);
    }

    public function test_a_cash_order_is_saved_as_placed_with_server_side_totals(): void
    {
        $product = $this->product();

        $this->postJson('/place-cash-order', $this->payload($product, quantity: 2))->assertOk();

        $order = Order::sole();
        $this->assertSame(OrderStatus::Placed, $order->status);
        $this->assertNotNull($order->placed_at);
        $this->assertSame('cash', $order->payment_method);
        $this->assertSame(sprintf('OSU-%d-%05d', now()->year, $order->id), $order->number);
        $this->assertSame(1800, $order->transport_fee);
        $this->assertSame(5800, $order->total);
        $this->assertSame('Kurtos Test', $order->items[0]['name']);
        $this->assertSame(2, $order->items[0]['quantity']);
    }

    public function test_a_cash_order_emails_the_restaurant_and_the_customer(): void
    {
        $this->postJson('/place-cash-order', $this->payload($this->product()))->assertOk();

        Mail::assertQueued(RestaurantOrderPlacedMail::class, fn ($mail) => $mail->hasTo('comenzi@osu.test'));
        Mail::assertQueued(CustomerOrderConfirmationMail::class, fn ($mail) => $mail->hasTo('ion@example.test'));
    }

    public function test_without_a_recipient_only_the_customer_is_emailed(): void
    {
        config(['ordering.notification_email' => '']);

        $this->postJson('/place-cash-order', $this->payload($this->product()))->assertOk();

        Mail::assertNotQueued(RestaurantOrderPlacedMail::class);
        Mail::assertQueued(CustomerOrderConfirmationMail::class);
    }

    public function test_the_order_emails_show_the_order_and_escape_customer_text(): void
    {
        $this->postJson('/place-cash-order', $this->payload($this->product(), [
            'notes' => '<script>alert(1)</script>',
            'apartment' => '12',
        ], quantity: 2))->assertOk();
        $order = Order::sole();

        (new RestaurantOrderPlacedMail($order))
            ->assertSeeInHtml($order->number)
            ->assertSeeInHtml('Kurtos Test')
            ->assertSeeInHtml('40,00 RON')
            ->assertSeeInHtml('Str. Lungă 1, Ap. 12, Brașov')
            ->assertSeeInHtml('/dashboard/comenzi')
            ->assertDontSeeInHtml('<script>alert(1)</script>', false);

        (new CustomerOrderConfirmationMail($order))
            ->assertSeeInHtml($order->number)
            ->assertSeeInHtml('58,00 RON')
            ->assertDontSeeInHtml('/dashboard/comenzi');
    }

    public function test_pickup_has_no_transport_and_needs_no_address(): void
    {
        $product = $this->product();

        $this->postJson('/place-cash-order', $this->payload($product, [
            'deliveryType' => 'ridicare',
            'street' => '',
            'city' => '',
        ]))->assertOk();

        $this->assertSame(2000, Order::sole()->total);
    }

    public function test_an_order_needs_contact_details_and_a_delivery_address(): void
    {
        $product = $this->product();

        $this->postJson('/place-cash-order', $this->payload($product, ['phone' => '']))
            ->assertStatus(422)->assertJsonValidationErrors('orderData.phone');
        $this->postJson('/place-cash-order', $this->payload($product, ['street' => '']))
            ->assertStatus(422)->assertJsonValidationErrors('orderData.street');

        $this->assertSame(0, Order::count());
    }

    public function test_priced_extras_are_charged_like_the_storefront_shows_them(): void
    {
        $product = $this->product(['options' => ['extra cașcaval (3,50 lei)', 'extra nucă +2 RON']]);

        $this->postJson('/place-cash-order', $this->payload(
            $product,
            ['deliveryType' => 'ridicare'],
            'extra cașcaval (3,50 lei), extra nucă +2 RON',
        ))->assertOk();

        $this->assertSame(2550, Order::sole()->items[0]['unit_amount']);
    }

    public function test_a_priced_extra_does_not_also_select_the_muschi_tier(): void
    {
        $product = $this->product([
            'price_with_muschi' => 2700,
            'options' => ['extra mușchi (4 lei)'],
        ]);

        $this->postJson('/place-cash-order', $this->payload(
            $product,
            ['deliveryType' => 'ridicare'],
            'extra mușchi (4 lei)',
        ))->assertOk();

        $this->assertSame(2400, Order::sole()->items[0]['unit_amount']);
    }

    public function test_an_option_the_product_does_not_offer_is_refused(): void
    {
        $product = $this->product(['options' => ['extra mușchi (4 lei)']]);

        $this->postJson('/place-cash-order', $this->payload($product, option: 'extra mușchi'))
            ->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_a_solved_captcha_is_checked_with_google_and_lets_the_order_through(): void
    {
        $this->fakeCaptcha(success: true);

        $this->postJson('/place-cash-order', [
            ...$this->payload($this->product()),
            'recaptchaToken' => 'token-1',
        ])->assertOk();

        $this->assertSame(1, Order::count());
        Http::assertSent(fn ($request) => $request->url() === 'https://www.google.com/recaptcha/api/siteverify'
            && $request['secret'] === 'captcha-secret'
            && $request['response'] === 'token-1');
    }

    public function test_a_rejected_captcha_saves_nothing_and_notifies_nobody(): void
    {
        $this->fakeCaptcha(success: false);

        $this->postJson('/place-cash-order', [
            ...$this->payload($this->product()),
            'recaptchaToken' => 'forged',
        ])->assertStatus(422)->assertJsonStructure(['error']);

        $this->assertSame(0, Order::count());
        Mail::assertNothingQueued();
    }

    public function test_an_order_without_a_token_never_reaches_google(): void
    {
        $this->fakeCaptcha(success: true);

        $this->postJson('/place-cash-order', $this->payload($this->product()))->assertStatus(422);

        $this->assertSame(0, Order::count());
        Http::assertNothingSent();
    }

    public function test_a_form_mistake_does_not_use_up_the_token(): void
    {
        $this->fakeCaptcha(success: true);

        $this->postJson('/place-cash-order', [
            ...$this->payload($this->product(), ['phone' => '']),
            'recaptchaToken' => 'token-1',
        ])->assertStatus(422)->assertJsonValidationErrors('orderData.phone');

        Http::assertNothingSent();
    }

    public function test_a_card_checkout_needs_the_captcha_before_stripe_is_called(): void
    {
        $this->fakeCaptcha(success: false);

        $this->postJson('/create-checkout-session', [
            ...$this->payload($this->product()),
            'recaptchaToken' => 'forged',
        ])->assertStatus(422);

        $this->assertSame([], $this->stripeRequests);
        $this->assertSame(0, Order::count());
    }

    public function test_an_order_is_refused_when_google_cannot_be_reached(): void
    {
        config(['services.recaptcha.secret' => 'captcha-secret']);
        Http::fake(['*' => Http::failedConnection()]);

        $this->postJson('/place-cash-order', [
            ...$this->payload($this->product()),
            'recaptchaToken' => 'token-1',
        ])->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_production_refuses_orders_while_the_secret_is_missing(): void
    {
        Http::fake();
        $this->app->detectEnvironment(fn () => 'production');

        $this->assertFalse(app(RecaptchaVerifier::class)->passes('token-1'));
        Http::assertNothingSent();
    }

    public function test_a_card_checkout_waits_for_payment_with_a_short_lived_session(): void
    {
        $product = $this->product();
        $this->stripeResponse = ['id' => 'cs_test_1', 'object' => 'checkout.session'];

        $this->postJson('/create-checkout-session', $this->payload($product))
            ->assertOk()->assertExactJson(['id' => 'cs_test_1']);

        $order = Order::sole();
        $this->assertSame(OrderStatus::PendingPayment, $order->status);
        $this->assertSame('cs_test_1', $order->stripe_session_id);
        $this->assertNull($order->placed_at);
        Mail::assertNothingQueued();
        $this->assertSame(
            now()->addMinutes(CheckoutController::SESSION_LIFETIME_MINUTES)->timestamp,
            (int) $this->stripeRequests[0]['params']['expires_at'],
        );
    }

    public function test_the_success_page_places_a_paid_order_once(): void
    {
        $product = $this->product();
        $this->stripeResponse = ['id' => 'cs_test_1', 'object' => 'checkout.session'];
        $this->postJson('/create-checkout-session', $this->payload($product))->assertOk();

        $this->stripeResponse = [
            'id' => 'cs_test_1',
            'object' => 'checkout.session',
            'payment_status' => 'paid',
            'amount_total' => 3500,
        ];

        $this->getJson('/api/stripe/success?session_id=cs_test_1')->assertOk();
        $order = Order::sole();
        $this->assertSame(OrderStatus::Placed, $order->status);
        $this->assertSame(3500, $order->total);
        $placedAt = $order->placed_at;

        $this->travel(2)->minutes();
        $this->getJson('/api/stripe/success?session_id=cs_test_1')->assertOk();
        $this->assertTrue($placedAt->equalTo($order->fresh()->placed_at));
        Mail::assertQueuedCount(2);
    }

    public function test_the_sweep_places_a_paid_order_whose_customer_closed_the_tab(): void
    {
        $product = $this->product();
        $this->stripeResponse = ['id' => 'cs_test_1', 'object' => 'checkout.session'];
        $this->postJson('/create-checkout-session', $this->payload($product))->assertOk();

        $this->stripeResponse = [
            'id' => 'cs_test_1',
            'object' => 'checkout.session',
            'payment_status' => 'paid',
            'amount_total' => 3800,
        ];
        $this->artisan('orders:confirm-payments')->assertSuccessful();

        $this->assertSame(OrderStatus::Placed, Order::sole()->status);
        Mail::assertQueued(RestaurantOrderPlacedMail::class);
        Mail::assertQueued(CustomerOrderConfirmationMail::class);
    }

    public function test_the_sweep_leaves_unpaid_orders_waiting_and_forgets_expired_ones(): void
    {
        $product = $this->product();
        $this->stripeResponse = ['id' => 'cs_test_1', 'object' => 'checkout.session'];
        $this->postJson('/create-checkout-session', $this->payload($product))->assertOk();

        $this->stripeResponse = [
            'id' => 'cs_test_1',
            'object' => 'checkout.session',
            'payment_status' => 'unpaid',
        ];
        $this->artisan('orders:confirm-payments')->assertSuccessful();
        $this->assertSame(OrderStatus::PendingPayment, Order::sole()->status);

        $requestsBefore = count($this->stripeRequests);
        $this->travel(CheckoutController::SESSION_LIFETIME_MINUTES + 6)->minutes();
        $this->artisan('orders:confirm-payments')->assertSuccessful();
        $this->assertCount($requestsBefore, $this->stripeRequests);
    }

    public function test_staff_see_waiting_orders_but_not_unpaid_ones(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $waiting = $this->placedOrder();
        $unpaid = $this->placedOrder();
        $unpaid->update(['status' => OrderStatus::PendingPayment]);

        $this->actingAs($admin)
            ->get(route('dashboard.orders'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Orders', false)
                ->has('waiting', 1)
                ->where('waiting.0.number', $waiting->fresh()->number)
                ->where('waiting.0.next_action', 'Acceptă')
                ->where('waiting.0.can_cancel', true)
                ->has('active', 0)
                ->has('finished', 0));
    }

    public function test_accepting_stops_the_order_waiting_and_records_who_did_it(): void
    {
        $admin = $this->admin();
        $order = $this->placedOrder();

        $this->advance($admin, $order, OrderStatus::Placed)->assertRedirect();

        $order->refresh();
        $this->assertSame(OrderStatus::Accepted, $order->status);
        $this->assertNotNull($order->accepted_at);
        $this->assertSame($admin->id, $order->accepted_by);
    }

    public function test_an_unpaid_card_order_cannot_be_accepted(): void
    {
        $admin = $this->admin();
        $order = $this->placedOrder();
        $order->update(['status' => OrderStatus::PendingPayment]);

        $this->advance($admin, $order, OrderStatus::PendingPayment);
        $this->advance($admin, $order, OrderStatus::Placed);

        $this->assertSame(OrderStatus::PendingPayment, $order->fresh()->status);
    }

    public function test_only_staff_can_see_or_change_orders(): void
    {
        $customer = User::factory()->create(['is_admin' => false]);
        $order = $this->placedOrder();
        $accept = ['from' => OrderStatus::Placed->value];
        $decline = ['reason' => 'test'];

        $this->get(route('dashboard.orders'))->assertRedirect(route('login'));
        $this->post(route('dashboard.orders.advance', $order), $accept)->assertRedirect(route('login'));
        $this->post(route('dashboard.orders.cancel', $order), $decline)->assertRedirect(route('login'));
        $this->actingAs($customer)->post(route('dashboard.orders.advance', $order), $accept)->assertForbidden();
        $this->actingAs($customer)->post(route('dashboard.orders.cancel', $order), $decline)->assertForbidden();

        $this->assertSame(OrderStatus::Placed, $order->fresh()->status);
    }

    public function test_a_delivery_order_goes_through_every_step_to_delivered(): void
    {
        $admin = $this->admin();
        $order = $this->placedOrder();
        $order->update(['delivery_type' => 'livrare', 'street' => 'Str. Lungă 1', 'city' => 'Brașov']);

        $steps = [
            OrderStatus::Placed, OrderStatus::Accepted, OrderStatus::Preparing,
            OrderStatus::Ready, OrderStatus::OutForDelivery,
        ];
        foreach ($steps as $from) {
            $this->advance($admin, $order, $from)->assertRedirect();
        }

        $order->refresh();
        $this->assertSame(OrderStatus::Completed, $order->status);
        $this->assertSame('Livrată', $order->statusLabel());
        foreach (['accepted_at', 'preparing_at', 'ready_at', 'out_for_delivery_at', 'completed_at'] as $column) {
            $this->assertNotNull($order->{$column}, $column);
        }
        $this->assertFalse($order->isCancellable());
    }

    public function test_a_pickup_order_is_handed_over_straight_from_ready(): void
    {
        $admin = $this->admin();
        $order = $this->placedOrder();

        foreach ([OrderStatus::Placed, OrderStatus::Accepted, OrderStatus::Preparing] as $from) {
            $this->advance($admin, $order, $from);
        }
        $this->assertSame('Marchează ridicată', $order->fresh()->nextActionLabel());

        $this->advance($admin, $order, OrderStatus::Ready);

        $order->refresh();
        $this->assertSame(OrderStatus::Completed, $order->status);
        $this->assertSame('Ridicată', $order->statusLabel());
        $this->assertNull($order->out_for_delivery_at);
    }

    public function test_a_double_click_moves_the_order_only_one_step(): void
    {
        $admin = $this->admin();
        $order = $this->placedOrder();

        $this->advance($admin, $order, OrderStatus::Placed);
        $this->advance($admin, $order, OrderStatus::Placed);

        $this->assertSame(OrderStatus::Accepted, $order->fresh()->status);
    }

    public function test_declining_tells_the_customer_why_and_ends_the_alerts(): void
    {
        $admin = $this->admin();
        $order = $this->placedOrder();

        $this->actingAs($admin)
            ->post(route('dashboard.orders.cancel', $order), ['reason' => 'Nu mai avem aluat azi.'])
            ->assertRedirect();

        $order->refresh();
        $this->assertSame(OrderStatus::Cancelled, $order->status);
        $this->assertSame('Nu mai avem aluat azi.', $order->cancellation_reason);
        $this->assertSame($admin->id, $order->cancelled_by);
        $this->assertNotNull($order->cancelled_at);
        $this->assertNull($order->refunded_at);
        $this->assertSame([], $this->stripeRequests);
        Mail::assertQueued(CustomerOrderCancelledMail::class, fn ($mail) => $mail->hasTo('ion@example.test'));

        (new CustomerOrderCancelledMail($order))
            ->assertSeeInHtml('Nu mai avem aluat azi.')
            ->assertDontSeeInHtml('Am returnat');
    }

    public function test_cancelling_needs_a_reason(): void
    {
        $order = $this->placedOrder();

        $this->actingAs($this->admin())
            ->post(route('dashboard.orders.cancel', $order), ['reason' => ' '])
            ->assertSessionHasErrors('reason');

        $this->assertSame(OrderStatus::Placed, $order->fresh()->status);
        Mail::assertNothingQueued();
    }

    public function test_cancelling_a_paid_card_order_refunds_it_once(): void
    {
        $order = $this->paidCardOrder();
        $this->stripeResponse = fn (string $url) => str_contains($url, '/v1/refunds')
            ? ['id' => 're_1', 'object' => 'refund', 'status' => 'succeeded']
            : ['id' => 'cs_test_9', 'object' => 'checkout.session', 'payment_intent' => 'pi_9'];
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('dashboard.orders.cancel', $order), ['reason' => 'Închidem mai devreme.']);
        $this->actingAs($admin)->post(route('dashboard.orders.cancel', $order), ['reason' => 'Al doilea click.']);

        $order->refresh();
        $this->assertSame(OrderStatus::Cancelled, $order->status);
        $this->assertSame('Închidem mai devreme.', $order->cancellation_reason);
        $this->assertNotNull($order->refunded_at);

        $refunds = array_values(array_filter($this->stripeRequests, fn ($r) => str_contains($r['url'], '/v1/refunds')));
        $this->assertCount(1, $refunds);
        $this->assertSame('pi_9', $refunds[0]['params']['payment_intent']);
        $this->assertContains("Idempotency-Key: osu-order-{$order->id}-refund", $refunds[0]['headers']);

        Mail::assertQueuedCount(1);
        (new CustomerOrderCancelledMail($order))->assertSeeInHtml('Am returnat 25,00 RON');
    }

    public function test_a_failed_refund_leaves_the_order_as_it_was(): void
    {
        $order = $this->paidCardOrder();
        $this->stripeStatus = 400;
        $this->stripeResponse = ['error' => ['type' => 'invalid_request_error', 'message' => 'No such payment']];

        $this->actingAs($this->admin())
            ->post(route('dashboard.orders.cancel', $order), ['reason' => 'Închidem mai devreme.'])
            ->assertRedirect()
            ->assertSessionHas('error');

        $order->refresh();
        $this->assertSame(OrderStatus::Placed, $order->status);
        $this->assertNull($order->refunded_at);
        $this->assertNull($order->cancellation_reason);
        Mail::assertNothingQueued();
    }

    public function test_a_finished_order_can_no_longer_be_cancelled(): void
    {
        $order = $this->placedOrder();
        $order->update(['status' => OrderStatus::Completed, 'completed_at' => now()]);

        $this->actingAs($this->admin())
            ->post(route('dashboard.orders.cancel', $order), ['reason' => 'Prea târziu.']);

        $this->assertSame(OrderStatus::Completed, $order->fresh()->status);
        Mail::assertNothingQueued();
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    private function advance(User $admin, Order $order, OrderStatus $from)
    {
        return $this->actingAs($admin)
            ->post(route('dashboard.orders.advance', $order), ['from' => $from->value]);
    }

    private function paidCardOrder(): Order
    {
        $order = $this->placedOrder();
        $order->update(['payment_method' => 'card', 'stripe_session_id' => 'cs_test_9']);

        return $order;
    }
}
