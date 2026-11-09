<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Checks a reCAPTCHA v2 token with Google. Tokens are single-use, so call this
 * once per submit and only after the rest of the request has validated.
 */
class RecaptchaVerifier
{
    private const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

    public function passes(?string $token): bool
    {
        $secret = (string) config('services.recaptcha.secret');

        if ($secret === '') {
            // development runs without a secret; production must never silently lose the check
            if (app()->isProduction()) {
                Log::critical('RECAPTCHA_SECRET_KEY is not set, so online orders are being refused.');

                return false;
            }

            return true;
        }

        if ($token === null || $token === '') {
            return false;
        }

        try {
            $response = Http::asForm()->timeout(5)->post(self::VERIFY_URL, [
                'secret' => $secret,
                'response' => $token,
            ]);
        } catch (ConnectionException $e) {
            Log::error('reCAPTCHA verification unreachable: '.$e->getMessage());

            return false;
        }

        if ($response->json('success') !== true) {
            Log::warning('reCAPTCHA token rejected', ['codes' => $response->json('error-codes')]);

            return false;
        }

        return true;
    }
}
