@php
    $ron = fn (int $bani) => number_format($bani / 100, 2, ',', '.').' RON';
@endphp

<h2>Produse</h2>
<ul>
@foreach ($order->items as $item)
    <li>
        {{ $item['quantity'] }} × {{ $item['name'] }}
        @if ($item['option'] !== '' && $item['option'] !== '-')
            ({{ $item['option'] }})
        @endif
        — {{ $ron($item['unit_amount'] * $item['quantity']) }}
    </li>
@endforeach
</ul>

<p>
    @if ($order->discount_percent > 0)
        <strong>Reducere:</strong> {{ $order->discount_percent }}%<br>
    @endif
    @if ($order->delivery_type === 'livrare')
        <strong>Transport:</strong> {{ $order->transport_fee > 0 ? $ron($order->transport_fee) : 'gratuit' }}<br>
    @endif
    <strong>Total:</strong> {{ $ron($order->total) }}
</p>

<p>
    <strong>Plată:</strong> {{ $order->payment_method === 'card' ? 'Card (plătit online)' : 'Numerar' }}<br>
    <strong>Când:</strong> {{ $order->scheduleLabel() }}
</p>
