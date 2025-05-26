<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class TermsController extends Controller
{
    // Display the editor page
    public function edit()
    {
        // Retrieve the current Terms and Conditions from a file or database
        $terms = Storage::disk('local')->exists('terms_and_conditions.txt')
            ? Storage::disk('local')->get('terms_and_conditions.txt')
            : '';

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
        // Retrieve the terms from storage or database
        $terms = Storage::disk('local')->exists('terms_and_conditions.txt')
            ? Storage::disk('local')->get('terms_and_conditions.txt')
            : '<p class="text-gray-700">No terms available.</p>';

        // Pass the terms to Inertia so React can use them
        return Inertia::render('TermeniSiConditii', [
            'terms' => $terms,
        ]);
    }
}
