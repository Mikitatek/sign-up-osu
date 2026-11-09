<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// No withoutOverlapping() here: it calls pcntl_signal, which Hestia disables in
// CLI, and the run would die holding the lock. The alert dedupes itself anyway.
Schedule::command('orders:confirm-payments')->everyMinute();
Schedule::command('orders:alert-unconfirmed')->everyMinute();
