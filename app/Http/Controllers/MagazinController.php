<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Inertia\Inertia;

class MagazinController extends Controller
{
    // Display the form
    public function showMagazin()
    {
        return Inertia::render('Magazin'); // This should match the component name
    }

    /** Public catalog — local products, în forma pe care o consumă frontend-ul. */
    public function products()
    {
        $products = Product::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Product $p) => $p->toStorefrontArray())
            ->values();

        return response()->json($products);
    }

    public function showEditieLimitata()
    {
        return Inertia::render('EditieLimitata'); // This should match the component name
    }

    public function showValoriNutritionale()
    {
        return Inertia::render('ValNutritionale'); // This should match the component name
    }
}
