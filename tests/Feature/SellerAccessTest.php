<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SellerAccessTest extends TestCase
{
    use RefreshDatabase;

    private function seller(): User
    {
        return User::factory()->create(['is_seller' => true]);
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

    public function test_a_seller_lands_on_the_orders_after_login(): void
    {
        $seller = $this->seller();

        $this->post('/login', ['email' => $seller->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard.orders', absolute: false));
    }

    public function test_a_seller_can_accept_and_decline_orders(): void
    {
        Mail::fake();
        $seller = $this->seller();
        $accepted = $this->placedOrder();
        $declined = $this->placedOrder();

        $this->actingAs($seller)->get(route('dashboard.orders'))->assertOk();
        $this->actingAs($seller)->post(route('dashboard.orders.advance', $accepted), ['from' => 'placed']);
        $this->actingAs($seller)->post(route('dashboard.orders.cancel', $declined), ['reason' => 'Nu mai avem aluat.']);

        $this->assertSame(OrderStatus::Accepted, $accepted->fresh()->status);
        $this->assertSame($seller->id, $accepted->fresh()->accepted_by);
        $this->assertSame(OrderStatus::Cancelled, $declined->fresh()->status);
    }

    public function test_every_other_dashboard_page_sends_a_seller_back_to_the_orders(): void
    {
        $seller = $this->seller();

        foreach (['dashboard', 'dashboard.products', 'dashboard.newsletter', 'dashboard.je-reports.index'] as $page) {
            $this->actingAs($seller)->get(route($page))->assertRedirect(route('dashboard.orders'));
        }
    }

    public function test_a_seller_cannot_change_anything_else(): void
    {
        $seller = $this->seller();

        $this->actingAs($seller)
            ->post(route('dashboard.products.store'), ['name' => 'Produs nou', 'price' => 10])
            ->assertForbidden();

        $this->assertDatabaseMissing('products', ['name' => 'Produs nou']);
    }

    public function test_an_account_with_neither_role_sees_no_orders(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard.orders'))->assertForbidden();
        $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
    }

    public function test_the_command_creates_a_verified_seller_who_sets_their_own_password(): void
    {
        Notification::fake();

        $this->artisan('users:seller', ['email' => 'Maria@Osu.test', 'name' => 'Maria Pop'])
            ->assertSuccessful();

        $user = User::where('email', 'maria@osu.test')->sole();
        $this->assertTrue($user->is_seller);
        $this->assertFalse((bool) $user->is_admin);
        $this->assertNotNull($user->email_verified_at);
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_the_password_email_is_in_romanian(): void
    {
        $user = User::factory()->create(['name' => 'Maria Pop']);

        $mail = (new ResetPassword('token-123'))->toMail($user);
        $html = (string) $mail->render();

        $this->assertSame('Setează-ți parola · Bătrânul Osu', $mail->subject);
        $this->assertStringContainsString('Bună, Maria Pop!', $html);
        $this->assertStringContainsString('expiră în 60 de minute', $html);
        $this->assertStringContainsString(e(route('password.reset', ['token' => 'token-123', 'email' => $user->email])), $html);
        $this->assertStringNotContainsString('Reset Password', $html);
    }

    public function test_a_new_seller_needs_a_name(): void
    {
        $this->artisan('users:seller', ['email' => 'maria@osu.test'])->assertFailed();

        $this->assertDatabaseMissing('users', ['email' => 'maria@osu.test']);
    }

    public function test_the_command_leaves_admins_alone(): void
    {
        Notification::fake();
        $admin = User::factory()->create(['is_admin' => true]);

        $this->artisan('users:seller', ['email' => $admin->email, 'name' => 'X'])->assertFailed();

        $this->assertFalse((bool) $admin->fresh()->is_seller);
        Notification::assertNothingSent();
    }

    public function test_removing_a_seller_takes_the_orders_away_at_once(): void
    {
        $seller = $this->seller();

        $this->artisan('users:seller', ['email' => $seller->email, '--remove' => true])->assertSuccessful();

        $this->assertFalse($seller->fresh()->is_seller);
        $this->actingAs($seller->fresh())->get(route('dashboard.orders'))->assertForbidden();
    }
}
