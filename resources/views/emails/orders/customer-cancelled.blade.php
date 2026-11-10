<h1>Comanda {{ $order->number }} a fost anulată</h1>

<p>Ne pare rău, {{ $order->contact_name }}, dar nu putem onora comanda ta.</p>

<p><strong>Motiv:</strong> {{ $order->cancellation_reason }}</p>

@if ($order->refunded_at)
    <p>
        Am returnat {{ number_format($order->total / 100, 2, ',', '.') }} RON pe cardul cu care ai plătit.
        Banii ajung de obicei în 5–10 zile lucrătoare, în funcție de bancă.
    </p>
@endif

@include('emails.orders.partials.summary')

<p>Pentru orice întrebare, ne găsești la 0723 758 663.</p>
