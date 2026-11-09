<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Inertia\Inertia;

class OrderController extends Controller
{
    private const ACCEPTED_SHOWN = 50;

    public function index()
    {
        $waiting = Order::where('status', OrderStatus::Placed)->orderBy('placed_at')->get();
        $accepted = Order::where('status', OrderStatus::Accepted)
            ->latest('accepted_at')
            ->limit(self::ACCEPTED_SHOWN)
            ->get();

        return Inertia::render('Dashboard/Orders', [
            'waiting' => $waiting->map(fn (Order $order) => $this->present($order))->values(),
            'accepted' => $accepted->map(fn (Order $order) => $this->present($order))->values(),
        ]);
    }

    public function accept(Order $order)
    {
        Order::whereKey($order->id)
            ->where('status', OrderStatus::Placed)
            ->update([
                'status' => OrderStatus::Accepted,
                'accepted_at' => now(),
                'accepted_by' => auth()->id(),
            ]);

        return back();
    }

    private function present(Order $order): array
    {
        return [
            'id' => $order->id,
            'number' => $order->number,
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
            'accepted_at' => $order->accepted_at?->toIso8601String(),
        ];
    }
}
