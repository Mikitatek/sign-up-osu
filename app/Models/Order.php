<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Mail\CustomerOrderConfirmationMail;
use App\Mail\RestaurantOrderPlacedMail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Mail;

class Order extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'items' => 'array',
            'discount_percent' => 'float',
            'transport_fee' => 'integer',
            'total' => 'integer',
            'placed_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (Order $order) {
            $order->forceFill([
                'number' => sprintf('OSU-%d-%05d', $order->created_at->year, $order->id),
            ])->saveQuietly();
        });
    }

    /**
     * Moves a card order to Placed once Stripe reports it paid. The success
     * page and the scheduled sweep can both get here, so only the first one
     * changes anything; the total becomes what Stripe actually charged.
     */
    public static function confirmStripePayment(string $sessionId, int $amountTotal): void
    {
        $placed = static::where('stripe_session_id', $sessionId)
            ->where('status', OrderStatus::PendingPayment)
            ->update([
                'status' => OrderStatus::Placed,
                'placed_at' => now(),
                'total' => $amountTotal,
            ]);

        if ($placed === 1) {
            static::where('stripe_session_id', $sessionId)->sole()->queueNotifications();
        }
    }

    /** Sent once, at the moment the order becomes real. No recipient means no staff email. */
    public function queueNotifications(): void
    {
        $restaurant = (string) config('ordering.notification_email');
        if ($restaurant !== '') {
            Mail::to($restaurant)->queue(new RestaurantOrderPlacedMail($this));
        }

        Mail::to($this->contact_email)->queue(new CustomerOrderConfirmationMail($this));
    }

    public function addressLine(): string
    {
        return collect([
            $this->street,
            $this->staircase ? "Sc. {$this->staircase}" : null,
            $this->floor ? "Et. {$this->floor}" : null,
            $this->apartment ? "Ap. {$this->apartment}" : null,
            $this->city,
        ])->filter()->implode(', ');
    }

    public function scheduleLabel(): string
    {
        $asap = in_array($this->scheduled_time, [null, 'asap', 'Cât mai curând'], true);

        return $asap
            ? 'Cât mai curând'
            : trim("{$this->scheduled_date} {$this->scheduled_time}");
    }
}
