<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
    ],

    // Push notifications for orders nobody accepts (orders:alert-unconfirmed).
    // Only the secret lives here; the public site key is in the storefront page.
    'recaptcha' => [
        'secret' => env('RECAPTCHA_SECRET_KEY', ''),
    ],

    // No topic means no alerts. On the public ntfy.sh anyone who knows the
    // topic can read it; the token is only for a server with access control.
    'ntfy' => [
        'url' => env('NTFY_URL', 'https://ntfy.sh'),
        'topic' => env('NTFY_TOPIC', ''),
        'token' => env('NTFY_TOKEN', ''),
    ],

];
