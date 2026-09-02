/**
 * Cookie consent manager.
 *
 * Non-essential trackers (Google Tag Manager / Analytics, TikTok Pixel) are
 * NEVER loaded until the visitor opts in. Google Consent Mode v2 is set to
 * "denied" by default before anything Google-related can run.
 *
 * Choice is stored for 6 months in the `osu_cookie_consent` cookie (+ a
 * localStorage mirror). Bump CONSENT_VERSION to force everyone to choose again.
 */

export const CONSENT_COOKIE = "osu_cookie_consent";
export const CONSENT_VERSION = 1;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months

const GTM_ID = "GTM-PR9QH8QL";
const TIKTOK_PIXEL_ID = "D1HP49JC77U195PQPPNG";

/** Categories the visitor can toggle. "necesare" is always on and not stored. */
export const CATEGORIES = ["statistica", "marketing"];

function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
}

/** Push the Consent Mode defaults. Sets no cookies itself; safe to call pre-consent. */
export function initConsentDefaults() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || gtag;
    gtag("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        functionality_storage: "granted",
        security_storage: "granted",
        wait_for_update: 500,
    });
}

export function readConsent() {
    let raw = null;
    try {
        raw = document.cookie
            .split("; ")
            .find((c) => c.startsWith(CONSENT_COOKIE + "="))
            ?.split("=")
            .slice(1)
            .join("=");
        if (raw) raw = decodeURIComponent(raw);
        if (!raw) raw = window.localStorage.getItem(CONSENT_COOKIE);
    } catch {
        return null;
    }
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.v !== CONSENT_VERSION) return null;
        return {
            statistica: !!parsed.statistica,
            marketing: !!parsed.marketing,
            ts: parsed.ts || null,
        };
    } catch {
        return null;
    }
}

export function writeConsent({ statistica, marketing }) {
    const value = JSON.stringify({
        v: CONSENT_VERSION,
        statistica: !!statistica,
        marketing: !!marketing,
        ts: new Date().toISOString(),
    });
    try {
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
            value
        )}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
        window.localStorage.setItem(CONSENT_COOKIE, value);
    } catch {
        /* storage blocked — the choice just won't persist */
    }
    applyConsent({ statistica: !!statistica, marketing: !!marketing });
}

/** Apply a consent state: update Consent Mode and load whatever is now allowed. */
export function applyConsent(consent) {
    gtag("consent", "update", {
        analytics_storage: consent.statistica ? "granted" : "denied",
        ad_storage: consent.marketing ? "granted" : "denied",
        ad_user_data: consent.marketing ? "granted" : "denied",
        ad_personalization: consent.marketing ? "granted" : "denied",
    });

    if (consent.statistica) loadGtm();
    if (consent.marketing) loadTikTok();
}

function loadGtm() {
    if (window.__osuGtmLoaded) return;
    window.__osuGtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(s);
}

function loadTikTok() {
    if (window.__osuTtqLoaded) return;
    window.__osuTtqLoaded = true;
    /* eslint-disable */
    !(function (w, d, t) {
        w.TiktokAnalyticsObject = t;
        var ttq = (w[t] = w[t] || []);
        ttq.methods = [
            "page", "track", "identify", "instances", "debug", "on", "off",
            "once", "ready", "alias", "group", "enableCookie", "disableCookie",
            "holdConsent", "revokeConsent", "grantConsent",
        ];
        ttq.setAndDefer = function (t, e) {
            t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
        };
        for (var i = 0; i < ttq.methods.length; i++)
            ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
                ttq.setAndDefer(e, ttq.methods[n]);
            return e;
        };
        ttq.load = function (e, n) {
            var r = "https://analytics.tiktok.com/i18n/pixel/events.js",
                o = n && n.partner;
            ttq._i = ttq._i || {};
            ttq._i[e] = [];
            ttq._i[e]._u = r;
            ttq._t = ttq._t || {};
            ttq._t[e] = +new Date();
            ttq._o = ttq._o || {};
            ttq._o[e] = n || {};
            n = document.createElement("script");
            n.type = "text/javascript";
            n.async = !0;
            n.src = r + "?sdkid=" + e + "&lib=" + t;
            e = document.getElementsByTagName("script")[0];
            e.parentNode.insertBefore(n, e);
        };
        ttq.load(TIKTOK_PIXEL_ID);
        ttq.page();
    })(window, document, "ttq");
    /* eslint-enable */
}

/** Re-apply a previously stored choice on page load (no UI). */
export function restoreConsent() {
    const c = readConsent();
    if (c) applyConsent(c);
    return c;
}
