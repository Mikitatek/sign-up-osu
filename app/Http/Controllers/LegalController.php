<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class LegalController extends Controller
{
    public function privacy()
    {
        return Inertia::render('Legal/Confidentialitate');
    }

    public function cookies()
    {
        return Inertia::render('Legal/Cookies');
    }
}
