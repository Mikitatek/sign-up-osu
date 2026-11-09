<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Http\Controllers\CheckoutController;
use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;

/**
 * A customer who pays and closes the tab never reaches the success page, so
 * without this sweep a paid order would stay invisible to the staff and to
 * the phone alert. Checkout sessions expire quickly, which keeps the set of
 * orders worth asking Stripe about small.
 */
class ConfirmOrderPayments extends Command
{
    protected $signature = 'orders:confirm-payments';

    protected $description = 'Ask Stripe about recent unpaid card orders and place the ones that were paid.';

    public function handle(): int
    {
        $pending = Order::query()
            ->where('status', OrderStatus::PendingPayment)
            ->where('created_at', '>=', Carbon::now()->subMinutes(CheckoutController::SESSION_LIFETIME_MINUTES + 5))
            ->pluck('stripe_session_id');

        if ($pending->isEmpty()) {
            return self::SUCCESS;
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        foreach ($pending as $sessionId) {
            try {
                $session = Session::retrieve($sessionId);
            } catch (ApiErrorException $e) {
                Log::error("Could not check Stripe session {$sessionId}: ".$e->getMessage());

                continue;
            }

            if ($session->payment_status === 'paid') {
                Order::confirmStripePayment($session->id, (int) $session->amount_total);
            }
        }

        return self::SUCCESS;
    }
}
