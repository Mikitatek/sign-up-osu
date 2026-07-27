<?php

namespace App\Http\Controllers;

use App\Models\NewsletterSignup;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NewsletterController extends Controller
{
    // Display the form
    public function showForm()
    {
        return Inertia::render('NewsletterSignUp'); // This should match the component name
    }

    // Handle form submission
    public function submitForm(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:newsletter_signups,email',
            'phone' => 'required|string|unique:newsletter_signups,phone|max:15',
            'gdpr' => 'required|accepted',
            'newsletter_agreement' => 'required|accepted',
        ]);

        // Mass assignment using the validated data
        NewsletterSignup::create($validated);

        return redirect()->route('home')->with('success', 'Thank you for signing up for our newsletter!');
    }

    public function index()
    {
        // Fetch all newsletter signups
        $signups = NewsletterSignup::all();

        // Pass the signups data to the Inertia view
        return Inertia::render('Dashboard/Newsletter', [
            'signups' => $signups,
        ]);
    }

    public function destroy($id)
    {
        // Find and delete the signup
        $signup = NewsletterSignup::findOrFail($id);
        $signup->delete();

        // Redirect back with a success message
        return redirect()->route('dashboard.newsletter')->with('success', 'Signup deleted successfully.');
    }
}
