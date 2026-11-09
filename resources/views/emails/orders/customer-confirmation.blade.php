<h1>Am primit comanda {{ $order->number }}</h1>

<p>Mulțumim, {{ $order->contact_name }}. Ne apucăm de treabă imediat!</p>

@if ($order->delivery_type === 'livrare')
    <p><strong>Livrare la:</strong> {{ $order->addressLine() }}</p>
@else
    <p><strong>Ridicare personală</strong></p>
@endif

@include('emails.orders.partials.summary')

<p>Pentru orice schimbare, ne găsești la 0723 758 663.</p>
