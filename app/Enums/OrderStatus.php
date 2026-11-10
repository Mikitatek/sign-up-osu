<?php

namespace App\Enums;

/** The same lifecycle as Dante's orders, without the courier steps. */
enum OrderStatus: string
{
    /** Card checkout started; Stripe has not confirmed the payment yet. */
    case PendingPayment = 'pending_payment';

    /** Waiting for the staff to accept it — the state the phone alert watches. */
    case Placed = 'placed';

    case Accepted = 'accepted';
    case Preparing = 'preparing';
    case Ready = 'ready';

    /** Delivery orders only; a pickup goes from Ready straight to Completed. */
    case OutForDelivery = 'out_for_delivery';

    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PendingPayment => 'În așteptarea plății',
            self::Placed => 'Plasată',
            self::Accepted => 'Acceptată',
            self::Preparing => 'În preparare',
            self::Ready => 'Gata',
            self::OutForDelivery => 'În livrare',
            self::Completed => 'Finalizată',
            self::Cancelled => 'Anulată',
        };
    }

    /** Where the moment an order reached this status is kept. */
    public function timestampColumn(): ?string
    {
        return match ($this) {
            self::PendingPayment => null,
            self::Placed => 'placed_at',
            self::Accepted => 'accepted_at',
            self::Preparing => 'preparing_at',
            self::Ready => 'ready_at',
            self::OutForDelivery => 'out_for_delivery_at',
            self::Completed => 'completed_at',
            self::Cancelled => 'cancelled_at',
        };
    }
}
