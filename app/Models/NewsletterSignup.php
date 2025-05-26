<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterSignup extends Model
{
    // Specify the fields that can be mass-assigned
    protected $fillable = [
        'name',
        'email',
        'phone',
        'gdpr',
        'newsletter_agreement'
    ];

    // Optionally, you can cast boolean fields to ensure they are treated as booleans
    protected $casts = [
        'gdpr' => 'boolean',
        'newsletter_agreement' => 'boolean',
    ];
}
