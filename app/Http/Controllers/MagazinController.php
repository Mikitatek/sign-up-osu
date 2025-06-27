<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class MagazinController extends Controller
{
    // Display the form
    public function showMagazin()
    {
        return Inertia::render('Magazin'); // This should match the component name
    }

    public function showValoriNutritionale()
    {
        return Inertia::render('ValNutritionale'); // This should match the component name
    }
}
