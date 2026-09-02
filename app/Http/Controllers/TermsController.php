<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TermsController extends Controller
{
    // Display the editor page
    public function edit()
    {
        $stored = Storage::disk('local')->exists('terms_and_conditions.txt')
            ? trim(Storage::disk('local')->get('terms_and_conditions.txt'))
            : '';

        // Seed the editor with the committed default so there's always a base
        // to work from.
        $terms = $stored !== ''
            ? $stored
            : file_get_contents(resource_path('legal/termeni-si-conditii.html'));

        return Inertia::render('Dashboard/TermsEditor', ['terms' => $terms]);
    }

    // Handle the update of Terms and Conditions
    public function update(Request $request)
    {
        $request->validate([
            'terms' => 'required|string',
        ]);

        // Save the new terms to a file or database
        Storage::disk('local')->put('terms_and_conditions.txt', $request->terms);

        return redirect()->route('dashboard.terms.editor')->with('success', 'Terms and Conditions updated successfully!');
    }

    public function show()
    {
        // Admin-edited version wins; otherwise fall back to the committed
        // default so the page is never empty in production.
        $stored = Storage::disk('local')->exists('terms_and_conditions.txt')
            ? trim(Storage::disk('local')->get('terms_and_conditions.txt'))
            : '';

        $terms = $stored !== ''
            ? $stored
            : file_get_contents(resource_path('legal/termeni-si-conditii.html'));

        return Inertia::render('TermeniSiConditii', [
            'terms' => $terms,
        ]);
    }
}
