<h1>Comandă nouă {{ $order->number }}</h1>

<p><strong>Tip:</strong> {{ $order->delivery_type === 'livrare' ? 'Livrare' : 'Ridicare personală' }}</p>
<p><strong>Client:</strong> {{ $order->contact_name }} · {{ $order->contact_phone }} · {{ $order->contact_email }}</p>

@if ($order->delivery_type === 'livrare')
    <p><strong>Adresă:</strong> {{ $order->addressLine() }}</p>
@endif

@if ($order->notes)
    <p><strong>Observații:</strong> {{ $order->notes }}</p>
@endif

@include('emails.orders.partials.summary')

<p><a href="{{ route('dashboard.orders') }}">Deschide comenzile și acceptă comanda</a></p>
