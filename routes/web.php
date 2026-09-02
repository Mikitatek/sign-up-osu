<?php

use App\Http\Controllers\Admin\JeReportController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\MagazinController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TermsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Stripe\Checkout\Session;
use Stripe\Stripe;

Route::get('/newsletter', [NewsletterController::class, 'showForm'])->name('home');

Route::post('/newsletter-signup', [NewsletterController::class, 'submitForm'])
    ->middleware('throttle:10,1')
    ->name('newsletter.signup');

Route::get('/termeni-si-conditii', [TermsController::class, 'show'])->name('termeni-si-conditii');
Route::get('/politica-de-confidentialitate', [LegalController::class, 'privacy'])->name('politica-confidentialitate');
Route::get('/politica-cookies', [LegalController::class, 'cookies'])->name('politica-cookies');

// MAGAZIN PART
Route::get('/magazin', [MagazinController::class, 'showMagazin'])->name('magazin');

// Route::get('/editie-speciala', [MagazinController::class, 'showEditieLimitata'])->name('editie-speciala');

Route::get('/valori-nutritionale', [MagazinController::class, 'showValoriNutritionale'])->name('valori-nutritionale');

// placeholder pana cand avem home page
Route::get('/', function () {
    return redirect()->route('magazin');
});

// Catalogul public vine din tabela locală `products` (nu din Stripe).
Route::get('/products', [MagazinController::class, 'products'])
    ->middleware('throttle:120,1')
    ->name('products.catalog');

// alias istoric — frontendul vechi cerea /stripe-products
Route::get('/stripe-products', [MagazinController::class, 'products'])
    ->middleware('throttle:120,1');

Route::post('/create-checkout-session', [CheckoutController::class, 'createSession'])
    ->middleware('throttle:30,1');

Route::post('/validate-promo', [CheckoutController::class, 'validatePromo'])
    ->middleware('throttle:20,1');

Route::get('/api/stripe/success', function (Request $request) {
    try {
        Stripe::setApiKey(config('services.stripe.secret'));

        $sessionId = $request->query('session_id');
        if (! $sessionId) {
            return response()->json(['success' => false, 'error' => 'Missing session_id'], 400);
        }

        $session = Session::retrieve($sessionId);
        if ($session->payment_status !== 'paid') {
            return response()->json(['success' => false, 'error' => 'Payment not confirmed'], 400);
        }

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        Log::error('Stripe Confirm Error: '.$e->getMessage());

        return response()->json(['success' => false, 'error' => 'Nu am putut confirma plata.'], 500);
    }
})->middleware('throttle:30,1');

Route::get('/success', fn () => Inertia::render('Success'));
Route::get('/cancel', fn () => Inertia::render('Cancel'));

Route::fallback(function () {
    return Inertia::render('Error404')
        ->toResponse(request())
        ->setStatusCode(404);
})->name('404');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Everything under /dashboard is for staff only — clients never get access.
Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // Newsletter
    Route::get('/dashboard/newsletter', [NewsletterController::class, 'index'])->name('dashboard.newsletter');
    Route::delete('dashboard/newsletter/{id}', [NewsletterController::class, 'destroy'])->name('dashboard.newsletter.destroy');

    // Terms and conditions
    Route::get('/dashboard/terms-editor', [TermsController::class, 'edit'])->name('dashboard.terms.editor');
    Route::post('/dashboard/terms-editor', [TermsController::class, 'update'])->name('dashboard.terms.update');

    // CRM produse (catalog local)
    Route::get('/dashboard/products', [ProductController::class, 'index'])->name('dashboard.products');
    Route::post('/dashboard/products/import-wolt', [ProductController::class, 'importWolt'])
        ->middleware('throttle:6,1')
        ->name('dashboard.products.import-wolt');
    Route::post('/dashboard/products', [ProductController::class, 'store'])->name('dashboard.products.store');
    Route::post('/dashboard/products/{product}', [ProductController::class, 'update'])->name('dashboard.products.update');
    Route::post('/dashboard/products/{product}/toggle', [ProductController::class, 'toggle'])->name('dashboard.products.toggle');
    Route::delete('/dashboard/products/{product}', [ProductController::class, 'destroy'])->name('dashboard.products.destroy');

    // Rapoarte jurnal electronic AMEF (.je)
    Route::get('/dashboard/je-reports', [JeReportController::class, 'index'])->name('dashboard.je-reports.index');
    Route::post('/dashboard/je-reports', [JeReportController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('dashboard.je-reports.store');
    Route::get('/dashboard/je-reports/{jeReport}', [JeReportController::class, 'show'])->name('dashboard.je-reports.show');
    Route::get('/dashboard/je-reports/{jeReport}/luna/{month}', [JeReportController::class, 'monthShow'])->name('dashboard.je-reports.month');
    Route::get('/dashboard/je-reports/{jeReport}/produs', [JeReportController::class, 'productShow'])->name('dashboard.je-reports.product');
    Route::get('/dashboard/je-reports/{jeReport}/export', [JeReportController::class, 'export'])->name('dashboard.je-reports.export');
    Route::delete('/dashboard/je-reports/{jeReport}', [JeReportController::class, 'destroy'])->name('dashboard.je-reports.destroy');
});

require __DIR__.'/auth.php';
