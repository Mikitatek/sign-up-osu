<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Mail\CustomerOrderCancelledMail;
use App\Mail\CustomerOrderConfirmationMail;
use App\Mail\RestaurantOrderPlacedMail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Stripe\Checkout\Session;
use Stripe\Refund;
use Stripe\Stripe;

class Order extends Model
{
    /** Staff may cancel until the order is over; while it is Placed, that is a decline. */
    public const CANCELLABLE = [
        OrderStatus::Placed,
        OrderStatus::Accepted,
        OrderStatus::Preparing,
        OrderStatus::Ready,
        OrderStatus::OutForDelivery,
    ];

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
            'preparing_at' => 'datetime',
            'ready_at' => 'datetime',
            'out_for_delivery_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'refunded_at' => 'datetime',
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

    /** Where the staff's next button takes the order; null once it is over. */
    public function nextStatus(): ?OrderStatus
    {
        return match ($this->status) {
            OrderStatus::Placed => OrderStatus::Accepted,
            OrderStatus::Accepted => OrderStatus::Preparing,
            OrderStatus::Preparing => OrderStatus::Ready,
            OrderStatus::Ready => $this->isDelivery() ? OrderStatus::OutForDelivery : OrderStatus::Completed,
            OrderStatus::OutForDelivery => OrderStatus::Completed,
            default => null,
        };
    }

    public function nextActionLabel(): ?string
    {
        return match ($this->nextStatus()) {
            OrderStatus::Accepted => 'Acceptă',
            OrderStatus::Preparing => 'Începe prepararea',
            OrderStatus::Ready => 'Marchează gata',
            OrderStatus::OutForDelivery => 'Pleacă la livrare',
            OrderStatus::Completed => $this->isDelivery() ? 'Marchează livrată' : 'Marchează ridicată',
            default => null,
        };
    }

    public function statusLabel(): string
    {
        if ($this->status === OrderStatus::Completed) {
            return $this->isDelivery() ? 'Livrată' : 'Ridicată';
        }

        return $this->status->label();
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, self::CANCELLABLE, true);
    }

    /**
     * Cancels the order and tells the customer why. A paid card order is
     * refunded first; when Stripe refuses, the order stays as it was and the
     * Stripe exception reaches the caller. Returns false when the order was
     * already over, for example cancelled by someone else a moment earlier.
     */
    public function cancel(string $reason, User $by): bool
    {
        $cancelled = DB::transaction(function () use ($reason, $by): bool {
            $locked = static::lockForUpdate()->findOrFail($this->id);
            if (! $locked->isCancellable()) {
                return false;
            }

            $refunded = $locked->refunded_at === null && $locked->refundCardPayment();

            $locked->update([
                'status' => OrderStatus::Cancelled,
                'cancelled_at' => now(),
                'cancelled_by' => $by->id,
                'cancellation_reason' => $reason,
                'refunded_at' => $refunded ? now() : $locked->refunded_at,
            ]);

            return true;
        });

        if ($cancelled) {
            $this->refresh();
            Mail::to($this->contact_email)->queue(new CustomerOrderCancelledMail($this));
        }

        return $cancelled;
    }

    /** Refunds a card payment in full; false when there was nothing to refund. */
    private function refundCardPayment(): bool
    {
        if ($this->payment_method !== 'card' || ! $this->stripe_session_id) {
            return false;
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $paymentIntent = Session::retrieve($this->stripe_session_id)->payment_intent;
        if (! $paymentIntent) {
            return false; // nothing was charged, e.g. a 100% discount
        }

        // the key makes a retried cancel refund once, never twice
        Refund::create(
            ['payment_intent' => is_string($paymentIntent) ? $paymentIntent : $paymentIntent->id],
            ['idempotency_key' => "osu-order-{$this->id}-refund"],
        );

        return true;
    }

    private function isDelivery(): bool
    {
        return $this->delivery_type === 'livrare';
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
