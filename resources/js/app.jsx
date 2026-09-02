import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import "@fortawesome/fontawesome-free/css/all.min.css";
import CookieConsent from "@/Components/CookieConsent";
import { initConsentDefaults, restoreConsent } from "@/lib/consent";

// Consent Mode must be "denied" before any Google tag can load; then re-apply
// whatever the visitor chose on a previous visit.
initConsentDefaults();
restoreConsent();

createInertiaApp({
    title: () => `Oșu Kurtos și Langos`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx")
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <CookieConsent />
            </>
        );
    },
    progress: {
        color: "#4B5563",
    },
});
