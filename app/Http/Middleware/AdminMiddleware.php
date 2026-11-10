<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // a seller who opens any other dashboard page is taken to the orders
        if ($user && ! $user->is_admin && $user->is_seller && $request->isMethod('GET')) {
            return redirect()->route('dashboard.orders');
        }

        abort_unless($user && $user->is_admin, 403);

        return $next($request);
    }
}
