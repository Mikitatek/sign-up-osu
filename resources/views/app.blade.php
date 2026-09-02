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

        <!-- TikTok Pixel Code Start -->
        <script>
        !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
        var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
        ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};


        ttq.load('D1HP49JC77U195PQPPNG');
        ttq.page();
        }(window, document, 'ttq');
        </script>
        <!-- TikTok Pixel Code End -->

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

    <!-- End Google Tag Manager -->
    </head>
    <body class="font-sans antialiased bg-[url('/resources/assets/cover.png')] bg-cover bg-center h-screen" >
        <!-- Google Tag Manager (noscript) -->
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PR9QH8QL"
        height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
        <!-- End Google Tag Manager (noscript) -->
        @inertia
    </body>
</html>
