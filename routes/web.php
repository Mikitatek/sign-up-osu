<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

use App\Http\Controllers\NewsletterController;

use App\Http\Controllers\MagazinController;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\TermsController;

use Stripe\Stripe;
use Stripe\Checkout\Session;
use Stripe\PromotionCode;


Route::get('/newsletter', [NewsletterController::class, 'showForm'])->name('home');

Route::post('/newsletter-signup', [NewsletterController::class, 'submitForm'])->name('newsletter.signup');

Route::get('/termeni-si-conditii', [TermsController::class, 'show'])->name('termeni-si-conditii');

//MAGAZIN PART
Route::get('/magazin', [MagazinController::class, 'showMagazin'])->name('magazin');

Route::get('/valori-nutritionale', [MagazinController::class, 'showValoriNutritionale'])->name('valori-nutritionale');

//placeholder pana cand avem home page
Route::get('/', function () {
    return redirect()->route('magazin');
});

Route::get('/stripe-products', function () {
    try {
        Stripe::setApiKey(config('services.stripe.secret'));

        // Fetch all products (max 100)
        $products = \Stripe\Product::all(['limit' => 100]);

        // Paginate all prices
        $allPrices = [];
        $startingAfter = null;

        do {
            $params = ['limit' => 100];
            if ($startingAfter) {
                $params['starting_after'] = $startingAfter;
            }

            $response = \Stripe\Price::all($params);
            $allPrices = array_merge($allPrices, $response->data);

            $hasMore = $response->has_more;
            $startingAfter = end($response->data)->id ?? null;
        } while ($hasMore);

        $groupedPrices = collect($allPrices)->groupBy('product');

        $result = collect($products->data)->map(function ($product) use ($groupedPrices) {
            $allPrices = $groupedPrices->get($product->id, []);
            return [
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'price' => $allPrices[0]->unit_amount ?? 0, // fallback
                'prices' => collect($allPrices)->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'unit_amount' => $p->unit_amount,
                        'metadata' => $p->metadata->toArray(),
                    ];
                }),
                'image' => $product->images[0] ?? '/images/default.jpg',
                'category' => $product->metadata['category'] ?? 'Altele',
                'metadata' => $product->metadata->toArray(),
            ];
        });

        return response()->json($result);
    } catch (Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});



Route::post('/create-checkout-session', function (Request $request) {
    try {
        Stripe::setApiKey(config('services.stripe.secret'));

        $items = $request->input('items', []);
        $promoCodeInput = trim($request->input('promoCode'));

        $lineItems = array_map(function ($item) {
            return [
                'price_data' => [
                    'currency' => 'ron',
                    'unit_amount' => $item['price'], // venit din frontend Ã®n bani
                    'product_data' => [
                        'name' => $item['name'] ?? 'Produs',
                        'description' => $item['option'] ?? '',
                        'metadata' => [
                            'option' => $item['option'] ?? '',
                        ],
                    ],
                ],
                'quantity' => $item['quantity'],
            ];
        }, $items);




        $params = [
            'payment_method_types' => ['card'],
            'line_items' => $lineItems,
            'mode' => 'payment',
            'success_url' => url('/success') . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => url('/cancel'),
        ];

        if (!empty($promoCodeInput)) {
            $promoCodes = PromotionCode::all(['active' => true]);
            $promo = collect($promoCodes->data)->first(fn($p) => strtolower($p->code) === strtolower($promoCodeInput));

            if ($promo) {
                $params['discounts'] = [[
                    'promotion_code' => $promo->id,
                ]];
            }
        }

        session([
            'order_data' => [
                'formData' => $request->input('orderData'),
                'items' => $request->input('items'),
                'discount' => $request->input('discount'),
                'total' => $request->input('total'),
            ]
        ]);

        $session = Session::create($params);

        return response()->json(['id' => $session->id]);
    } catch (\Exception $e) {
        Log::error('Stripe Error: ' . $e->getMessage());
        return response()->json(['error' => $e->getMessage()], 500);
    }
});


Route::post('/validate-promo', function (Request $request) {
    Stripe::setApiKey(config('services.stripe.secret'));

    $code = trim($request->input('code'));

    try {
        $promotionCodes = PromotionCode::all([
            'limit' => 100,
        ]);

        // ðŸªµ Log pentru debug
        Log::info('Coduri promo returnate de Stripe:', collect($promotionCodes->data)->pluck('code')->toArray());

        $promo = collect($promotionCodes->data)->first(function ($p) use ($code) {
            return strtolower($p->code) === strtolower($code);
        });

        if ($promo && $promo->coupon && $promo->coupon->percent_off) {
            return response()->json([
                'valid' => true,
                'discount' => $promo->coupon->percent_off,
            ]);
        } else {
            return response()->json(['valid' => false]);
        }
    } catch (\Exception $e) {
        return response()->json(['valid' => false, 'error' => $e->getMessage()]);
    }
});


Route::get('/api/stripe/success', function (Request $request) {
    try {
        Stripe::setApiKey(config('services.stripe.secret'));

        $sessionId = $request->query('session_id');
        if (!$sessionId) {
            return response()->json(['success' => false, 'error' => 'Missing session_id'], 400);
        }

        $session = Session::retrieve($sessionId);
        if ($session->payment_status !== 'paid') {
            return response()->json(['success' => false, 'error' => 'Payment not confirmed'], 400);
        }

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        Log::error('Stripe Confirm Error: ' . $e->getMessage());
        return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
});




Route::get('/success', fn() => Inertia::render('Success'));
Route::get('/cancel', fn() => Inertia::render('Cancel'));

// Route::get('/welcome', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    //Newsletter
    Route::get('/dashboard/newsletter', [NewsletterController::class, 'index'])->name('dashboard.newsletter');
    Route::delete('dashboard/newsletter/{id}', [NewsletterController::class, 'destroy'])->name('dashboard.newsletter.destroy');

    //Terms and conditions
    Route::get('/dashboard/terms-editor', [TermsController::class, 'edit'])->name('dashboard.terms.editor');
    Route::post('/dashboard/terms-editor', [TermsController::class, 'update'])->name('dashboard.terms.update');
});

require __DIR__ . '/auth.php';
