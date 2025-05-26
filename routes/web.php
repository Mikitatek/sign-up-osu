<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\TermsController;

// Define the root route for the newsletter sign-up page
Route::get('/', [NewsletterController::class, 'showForm'])->name('home');
Route::post('/newsletter-signup', [NewsletterController::class, 'submitForm'])->name('newsletter.signup');

Route::get('/termeni-si-conditii', [TermsController::class, 'show'])->name('termeni-si-conditii');


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
