<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Stripe\Exception\ApiErrorException;

class OrderController extends Controller
{
    private const FINISHED_SHOWN = 50;

    private const IN_PROGRESS = [
        OrderStatus::Accepted,
        OrderStatus::Preparing,
        OrderStatus::Ready,
        OrderStatus::OutForDelivery,
    ];

    public function index()
    {
        $waiting = Order::where('status', OrderStatus::Placed)->orderBy('placed_at')->get();
        $active = Order::whereIn('status', self::IN_PROGRESS)->orderBy('placed_at')->get();
        $finished = Order::whereIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])
            ->latest('updated_at')
            ->limit(self::FINISHED_SHOWN)
            ->get();

        $present = fn ($orders) => $orders->map(fn (Order $order) => $this->present($order))->values();

        return Inertia::render('Dashboard/Orders', [
            'waiting' => $present($waiting),
            'active' => $present($active),
            'finished' => $present($finished),
        ]);
    }

    /**
     * One step forward. The button sends the status it was showing, so a
     * double click, or two people pressing at once, moves the order one step.
     */
    public function advance(Request $request, Order $order)
    {
        $from = OrderStatus::tryFrom((string) $request->input('from'));
        $to = $order->nextStatus();

        if ($from !== null && $from === $order->status && $to !== null) {
            $changes = ['status' => $to, $to->timestampColumn() => now()];
            if ($to === OrderStatus::Accepted) {
                $changes['accepted_by'] = $request->user()->id;
            }

            Order::whereKey($order->id)->where('status', $from)->update($changes);
        }

        return back();
    }

    /** Declining (while Placed) and cancelling later are the same action. */
    public function cancel(Request $request, Order $order)
    {
        $reason = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ])['reason'];

        try {
            $order->cancel($reason, $request->user());
        } catch (ApiErrorException $e) {
            Log::error("Refund failed for order {$order->number}: ".$e->getMessage());

            return back()->with('error', "Comanda {$order->number} nu a fost anulată: Stripe n-a putut returna plata. Încearcă din nou sau verifică în Stripe.");
        }

        return back();
    }

    private function present(Order $order): array
    {
        return [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status->value,
            'status_label' => $order->statusLabel(),
            'next_action' => $order->nextActionLabel(),
            'can_cancel' => $order->isCancellable(),
            'payment_method' => $order->payment_method,
            'contact_name' => $order->contact_name,
            'contact_phone' => $order->contact_phone,
            'delivery_type' => $order->delivery_type,
            'address' => $order->addressLine(),
            'notes' => $order->notes,
            'schedule' => $order->scheduleLabel(),
            'items' => $order->items,
            'total' => $order->total,
            'placed_at' => $order->placed_at?->toIso8601String(),
            'finished_at' => ($order->completed_at ?? $order->cancelled_at)?->toIso8601String(),
            'cancellation_reason' => $order->cancellation_reason,
            'refunded' => $order->refunded_at !== null,
        ];
    }
}
