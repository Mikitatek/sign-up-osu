<?php

return [
    // Where new-order emails go; the real address lives only in each .env.
    'notification_email' => env('ORDER_NOTIFICATION_EMAIL', ''),

    /*
    |--------------------------------------------------------------------------
    | Alert for unaccepted orders
    |--------------------------------------------------------------------------
    |
    | orders:alert-unconfirmed sends an urgent ntfy notification (see
    | services.ntfy) once an order has stayed Placed for after_minutes, then
    | again every repeat_minutes until nothing is left waiting.
    |
    */
    'unconfirmed_alert' => [
        'after_minutes' => (int) env('ORDER_ALERT_AFTER_MINUTES', 5),
        'repeat_minutes' => (int) env('ORDER_ALERT_REPEAT_MINUTES', 5),
    ],
];
