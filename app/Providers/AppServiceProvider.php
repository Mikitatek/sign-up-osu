<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Laravel\Pail\PailServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        if ($this->app->environment('local') || $this->app->runningInConsole()) {
            $this->app->register(PailServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // new sellers get this link to set their first password, so it reads as "set", not "reset"
        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            return (new MailMessage)
                ->subject('Setează-ți parola · Bătrânul Osu')
                ->view('emails.auth.set-password', [
                    'name' => $notifiable->name,
                    'url' => $url,
                    'minutes' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire'),
                ]);
        });

        // shared Inertia props (auth, errors, flash) live in
        // App\Http\Middleware\HandleInertiaRequests
    }
}
