<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Same alert as the Dante delivery app, on the same ntfy topic: once an order
 * has sat Placed too long, an urgent notification goes out, and again every
 * few minutes until someone accepts it from /dashboard/comenzi.
 *
 * ntfy only notifies; an Android phone subscribed to the topic turns the
 * notification into a call (MacroDroid). The title is the fixed text that
 * automation matches on, and the payload carries order numbers only because
 * it transits a third-party push service.
 */
class AlertUnconfirmedOrders extends Command
{
    private const LAST_ALERT_KEY = 'orders:unconfirmed-alert:last-call';

    /** What the phone's automation matches on; it must stay identical to Dante's. */
    public const TITLE = 'Comandă neacceptată';

    protected $signature = 'orders:alert-unconfirmed';

    protected $description = 'Send an urgent ntfy alert, which a phone turns into a call, while placed orders stay unaccepted.';

    public function handle(): int
    {
        $topic = (string) config('services.ntfy.topic');
        if ($topic === '') {
            return self::SUCCESS;
        }

        $placedBefore = Carbon::now()->subMinutes((int) config('ordering.unconfirmed_alert.after_minutes', 5));

        $waiting = Order::query()
            ->where('status', OrderStatus::Placed)
            ->where('placed_at', '<=', $placedBefore)
            ->orderBy('placed_at')
            ->pluck('number');

        if ($waiting->isEmpty()) {
            return self::SUCCESS;
        }

        // One alert per window however many orders wait: each one is a call.
        $repeatSeconds = 60 * (int) config('ordering.unconfirmed_alert.repeat_minutes', 5);
        if (! Cache::add(self::LAST_ALERT_KEY, Carbon::now()->toIso8601String(), $repeatSeconds)) {
            return self::SUCCESS;
        }

        $token = (string) config('services.ntfy.token');
        try {
            // JSON publishing keeps the Romanian title intact; ntfy headers
            // would need it RFC 2047-encoded.
            $response = Http::when($token !== '', fn ($request) => $request->withToken($token))
                ->timeout(15)
                ->post(rtrim((string) config('services.ntfy.url'), '/'), [
                    'topic' => $topic,
                    'title' => self::TITLE,
                    'message' => $this->message($waiting->all()),
                    'priority' => 5,
                    'tags' => ['rotating_light'],
                    'click' => route('dashboard.orders'),
                ]);
        } catch (ConnectionException $e) {
            return $this->failed('ntfy could not be reached', ['error' => $e->getMessage()]);
        }

        if (! $response->successful()) {
            return $this->failed("ntfy refused the alert (HTTP {$response->status()})", ['body' => $response->body()]);
        }

        $this->info("Alerted ntfy about {$waiting->count()} unconfirmed order(s): {$waiting->implode(', ')}.");

        return self::SUCCESS;
    }

    /** @param  list<string>  $numbers */
    private function message(array $numbers): string
    {
        $count = count($numbers);
        $lead = $count === 1
            ? 'O comandă așteaptă să fie acceptată'
            : "{$count} comenzi așteaptă să fie acceptate";

        return $lead.': '.implode(', ', $numbers);
    }

    /** @param  array<string, mixed>  $context */
    private function failed(string $reason, array $context): int
    {
        // Let the next sweep try again rather than wait out the window.
        Cache::forget(self::LAST_ALERT_KEY);
        Log::error('Unconfirmed-order alert failed: '.$reason, $context);
        $this->error($reason.'.');

        return self::FAILURE;
    }
}
