<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        $isHtml = $response->headers->get('Content-Type') &&
                  str_contains($response->headers->get('Content-Type'), 'text/html');

        if ($isHtml && app()->isProduction()) {
            $response->headers->set(
                'Content-Security-Policy',
                implode('; ', [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://analytics.tiktok.com",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' data: https://fonts.gstatic.com",
                    "img-src 'self' data: blob: https://*.stripe.com https://www.google-analytics.com https://analytics.tiktok.com",
                    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://api.emailjs.com https://analytics.tiktok.com",
                    'frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.google.com',
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self' https://checkout.stripe.com",
                    'upgrade-insecure-requests',
                ])
            );
        }

        // HSTS — only meaningful over HTTPS
        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
