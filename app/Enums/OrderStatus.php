<?php

namespace App\Enums;

enum OrderStatus: string
{
    /** Card checkout started; Stripe has not confirmed the payment yet. */
    case PendingPayment = 'pending_payment';

    /** Waiting for the staff to accept it — the state the phone alert watches. */
    case Placed = 'placed';

    case Accepted = 'accepted';
}
