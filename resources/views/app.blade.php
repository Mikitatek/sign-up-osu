<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ "Oșu Kurtos și Langos" }}</title>
        <link rel="icon" href="{{ asset('favicon.ico') }}" type="image/x-icon">
        <meta name="description" content="Comandă online kurtos și langosi proaspeți de la Bătrânul Osu. Livrare rapidă în Brașov și în zonă. Gust autentic.">

        <meta property="og:title" content="Bătrânul Osu - Kurtos și Langosi Brașov">
        <meta property="og:description" content="Comandă online kurtosi si langosi tradiționali. Livrare rapidă în Brașov.">
        <meta property="og:image" content="https://www.batranul-osu.ro/img/cover-delivery.png">
        <meta property="og:url" content="https://www.batranul-osu.ro/">
        <meta property="og:type" content="website">

        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Bătrânul Osu - Kurtos și Langosi Brașov">
        <meta name="twitter:description" content="Comandă online kurtosi si langosi tradiționali. Livrare rapidă în Brașov..">
        <meta name="twitter:image" content="https://www.batranul-osu.ro/img/cover-delivery.png">

        <link rel="canonical" href="https://www.batranul-osu.ro/">
        <link rel="apple-touch-icon" href="{{ asset('favicon.png') }}">
        <link rel="manifest" href="/site.webmanifest">  

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        
        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead

        {{-- Analytics/marketing tags (TikTok Pixel, Google Tag Manager) are loaded
             from resources/js/lib/consent.js ONLY after the visitor opts in via the
             cookie banner. Do not add tracking scripts directly here. --}}

        <script type="application/ld+json">
        {
        "@context": "https://schema.org",
        "@type": "Bakery",
        "name": "Bătrânul Osu",
        "image": "https://www.batranul-osu.ro/images/og-image.jpg",
        "url": "https://www.batranul-osu.ro/",
        "telephone": "+40723758663",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Strada Egretei nr.1",
            "addressLocality": "Brașov",
            "postalCode": "500461",
            "addressCountry": "RO"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": "45.657973",
            "longitude": "25.601198"
        },
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
            ],
            "opens": "10:00",
            "closes": "23:59"
        }
        }
        </script>

    </head>
    <body class="font-sans antialiased bg-[url('/resources/assets/cover.png')] bg-cover bg-center h-screen" >
        @inertia
    </body>
</html>
