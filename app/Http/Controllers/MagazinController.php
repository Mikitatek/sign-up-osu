<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Stripe\Stripe;
use App\Models\ProductVisibility;

class MagazinController extends Controller
{
    // Display the form
    public function showMagazin()
    {
        return Inertia::render('Magazin'); // This should match the component name
    }
    public function showEditieLimitata()
    {
        return Inertia::render('EditieLimitata'); // This should match the component name
    }

    public function showValoriNutritionale()
    {
        return Inertia::render('ValNutritionale'); // This should match the component name
    }

    /** Admin: list all Stripe products with active flag */
    public function dashboardProducts()
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        // Fetch Stripe products (up to 100)
        $products = \Stripe\Product::all(['limit' => 100])->data;

        // Map is_active from local DB (default true if missing)
        $vis = ProductVisibility::pluck('is_active', 'stripe_product_id');

        $result = collect($products)->map(function ($p) use ($vis) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'image' => $p->images[0] ?? '/images/default.jpg',
                'category' => $p->metadata['category'] ?? 'Altele',
                'is_active' => $vis[$p->id] ?? true,
            ];
        })->values();

        return Inertia::render('Dashboard/Products', [
            'products' => $result,
        ]);
    }

    /** Admin: toggle is_active */
    public function toggleProduct(Request $request)
    {
        $data = $request->validate([
            'stripe_product_id' => 'required|string',
            'is_active' => 'required|boolean',
        ]);

        ProductVisibility::updateOrCreate(
            ['stripe_product_id' => $data['stripe_product_id']],
            ['is_active' => $data['is_active']]
        );

        return response()->json(['ok' => true]);
    }
}
