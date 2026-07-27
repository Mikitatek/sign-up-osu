<?php

use Illuminate\Foundation\Application;
use Illuminate\Translation\TranslationServiceProvider;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function ($middleware) {
        $middleware->alias([
            'admin' => App\Http\Middleware\AdminMiddleware::class,
        ]);
        $middleware->web(append: [
            App\Http\Middleware\HandleInertiaRequests::class,
            App\Http\Middleware\SecurityHeaders::class,
        ]);
    })
    ->withExceptions(function ($exceptions) {
        //
    })->create();

// Înregistrăm serviciul de traduceri DOAR DUPĂ ce $app e creat
$app->register(TranslationServiceProvider::class);

return $app;
