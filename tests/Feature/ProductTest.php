<?php

namespace Tests\Feature;

use App\Http\Controllers\CheckoutController;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    private function makeProduct(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Kurtos Test',
            'slug' => 'kurtos-test',
            'category' => 'Kurtos',
            'price' => 2290,
            'is_active' => true,
        ], $attrs));
    }

    public function test_public_catalog_returns_only_active_products_in_storefront_shape(): void
    {
        $this->makeProduct([
            'price_with_muschi' => 2790,
            'options' => ['extra cașcaval', 'extra mușchi'],
            'one_option' => ['simplu'],
        ]);
        $this->makeProduct(['name' => 'Ascuns', 'slug' => 'ascuns', 'is_active' => false]);

        $response = $this->get('/products')->assertOk()->json();

        $this->assertCount(1, $response);
        $product = $response[0];
        $this->assertSame('Kurtos Test', $product['name']);
        $this->assertSame(2290, $product['price']);
        $this->assertSame('basic', $product['prices'][0]['metadata']['option']);
        $this->assertSame(2790, $product['prices'][1]['unit_amount']);
        $this->assertSame('with_muschi', $product['prices'][1]['metadata']['option']);
        $this->assertSame(['extra cașcaval', 'extra mușchi'], json_decode($product['metadata']['options'], true));
        $this->assertSame(['simplu'], json_decode($product['metadata']['oneoption'], true));

        // legacy alias still answers
        $this->get('/stripe-products')->assertOk();
    }

    public function test_non_admins_cannot_manage_products(): void
    {
        $client = User::factory()->create(['is_admin' => false]);
        $product = $this->makeProduct();

        $this->actingAs($client)->get('/dashboard/products')->assertForbidden();
        $this->actingAs($client)->post('/dashboard/products', [])->assertForbidden();
        $this->actingAs($client)->post("/dashboard/products/{$product->id}/toggle", ['is_active' => false])->assertForbidden();
        $this->actingAs($client)->delete("/dashboard/products/{$product->id}")->assertForbidden();
    }

    public function test_admin_can_create_update_toggle_and_delete_a_product(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('dashboard.products.store'), [
            'name' => 'Langos Nou',
            'description' => 'descriere',
            'category' => 'Langos',
            'price_lei' => '14.50',
            'price_with_muschi_lei' => '19.90',
            'options_text' => "extra cașcaval\nextra mușchi",
            'one_option_text' => '',
            'is_active' => '1',
            'sort_order' => '5',
        ])->assertRedirect(route('dashboard.products'));

        $product = Product::where('name', 'Langos Nou')->firstOrFail();
        $this->assertSame('langos-nou', $product->slug);
        $this->assertSame(1450, $product->price);
        $this->assertSame(1990, $product->price_with_muschi);
        $this->assertSame(['extra cașcaval', 'extra mușchi'], $product->options);
        $this->assertNull($product->one_option);
        $this->assertTrue($product->is_active);

        $this->actingAs($admin)->post(route('dashboard.products.update', $product), [
            'name' => 'Langos Redenumit',
            'description' => '',
            'category' => 'Langos',
            'price_lei' => '15.00',
            'options_text' => '',
            'one_option_text' => '',
            'is_active' => '1',
            'sort_order' => '5',
        ])->assertRedirect(route('dashboard.products'));
        $product->refresh();
        $this->assertSame('Langos Redenumit', $product->name);
        $this->assertSame('langos-redenumit', $product->slug);
        $this->assertSame(1500, $product->price);
        $this->assertNull($product->price_with_muschi);

        $this->actingAs($admin)
            ->postJson(route('dashboard.products.toggle', $product), ['is_active' => false])
            ->assertOk();
        $this->assertFalse($product->refresh()->is_active);

        $this->actingAs($admin)
            ->delete(route('dashboard.products.destroy', $product))
            ->assertRedirect(route('dashboard.products'));
        $this->assertSame(0, Product::count());
    }

    public function test_checkout_rejects_unknown_or_inactive_products(): void
    {
        $inactive = $this->makeProduct(['is_active' => false]);

        $payload = fn (string $id) => [
            'items' => [['product_id' => $id, 'option' => '-', 'quantity' => 1]],
            'orderData' => ['deliveryType' => 'livrare'],
        ];

        $this->postJson('/create-checkout-session', $payload((string) $inactive->id))
            ->assertStatus(422);
        $this->postJson('/create-checkout-session', $payload('9999'))
            ->assertStatus(422);
        $this->postJson('/create-checkout-session', $payload('slug-inexistent'))
            ->assertStatus(422);
    }

    public function test_checkout_price_selection_uses_muschi_variant_and_diacritics(): void
    {
        $product = $this->makeProduct(['price' => 2290, 'price_with_muschi' => 2790]);

        $controller = new CheckoutController;
        $method = new \ReflectionMethod($controller, 'unitAmountFor');

        $this->assertSame(2290, $method->invoke($controller, $product, '-'));
        $this->assertSame(2790, $method->invoke($controller, $product, 'extra mușchi'));
        $this->assertSame(2790, $method->invoke($controller, $product, 'extra muşchi')); // s-cedilla
        $this->assertSame(2790, $method->invoke($controller, $product, 'EXTRA MUSCHI'));

        $noVariant = $this->makeProduct(['name' => 'Simplu', 'slug' => 'simplu', 'price' => 1450]);
        $this->assertSame(1450, $method->invoke($controller, $noVariant, 'extra mușchi'));
    }
}
