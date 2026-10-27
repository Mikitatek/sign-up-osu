<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
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
            'admin' => AdminMiddleware::class,
        ]);
        $middleware->web(append: [
            HandleInertiaRequests::class,
            SecurityHeaders::class,
        ]);
    })
    ->withExceptions(function ($exceptions) {
        //
    })->create();

// Înregistrăm serviciul de traduceri DOAR DUPĂ ce $app e creat
$app->register(TranslationServiceProvider::class);

return $app;
