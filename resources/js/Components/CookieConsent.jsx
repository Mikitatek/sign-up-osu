import { useEffect, useState } from "react";
import { readConsent, writeConsent } from "@/lib/consent";

/**
 * GDPR / Law 506/2004 cookie consent banner.
 * - shows once until a choice is made (stored 6 months)
 * - "Acceptă toate" / "Respinge" are equally prominent
 * - "Setări" lets the visitor toggle Statistică / Marketing
 * - reopen anytime via the "Setări cookies" link in the footer
 *   (window event "osu:open-cookie-settings")
 */
export default function CookieConsent() {
    const [open, setOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [prefs, setPrefs] = useState({ statistica: false, marketing: false });

    useEffect(() => {
        const existing = readConsent();
        if (!existing) {
            setOpen(true);
        } else {
            setPrefs({
                statistica: existing.statistica,
                marketing: existing.marketing,
            });
        }

        const reopen = () => {
            const c = readConsent();
            if (c)
                setPrefs({ statistica: c.statistica, marketing: c.marketing });
            setShowSettings(true);
            setOpen(true);
        };
        window.addEventListener("osu:open-cookie-settings", reopen);
        return () =>
            window.removeEventListener("osu:open-cookie-settings", reopen);
    }, []);

    if (!open) return null;

    const decide = (choice) => {
        writeConsent(choice);
        setOpen(false);
        setShowSettings(false);
    };

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-4 sm:pb-4"
            role="dialog"
            aria-modal="true"
            aria-label="Setări cookies"
        >
            <div className="mx-auto max-w-3xl rounded-xl bg-white p-4 shadow-2xl ring-1 ring-black/10 sm:p-5">
                <h2 className="text-sm font-bold text-gray-900">
                    Acest site folosește cookie-uri
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    Folosim cookie-uri strict necesare pentru funcționarea
                    site-ului și, doar cu acordul tău, cookie-uri de statistică
                    și de marketing. Poți accepta tot, respinge tot sau alege pe
                    categorii. Detalii în{" "}
                    <a
                        href="/politica-cookies"
                        className="font-semibold text-emerald-800 underline"
                    >
                        Politica de cookies
                    </a>{" "}
                    și{" "}
                    <a
                        href="/politica-de-confidentialitate"
                        className="font-semibold text-emerald-800 underline"
                    >
                        Politica de confidențialitate
                    </a>
                    .
                </p>

                {showSettings && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        <Row
                            title="Strict necesare"
                            desc="Sesiune, coș de cumpărături, securitate. Nu pot fi dezactivate."
                            checked
                            disabled
                        />
                        <Row
                            title="Statistică"
                            desc="Google Analytics — ne ajută să înțelegem cum e folosit site-ul."
                            checked={prefs.statistica}
                            onChange={(v) =>
                                setPrefs((p) => ({ ...p, statistica: v }))
                            }
                        />
                        <Row
                            title="Marketing"
                            desc="TikTok Pixel — pentru măsurarea și optimizarea reclamelor."
                            checked={prefs.marketing}
                            onChange={(v) =>
                                setPrefs((p) => ({ ...p, marketing: v }))
                            }
                        />
                    </div>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {!showSettings && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="order-3 rounded-md px-4 py-2 text-xs font-semibold text-gray-700 underline sm:order-1"
                        >
                            Setări
                        </button>
                    )}
                    <button
                        onClick={() =>
                            decide({ statistica: false, marketing: false })
                        }
                        className="order-2 rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                        Respinge
                    </button>
                    {showSettings ? (
                        <button
                            onClick={() => decide(prefs)}
                            className="order-1 rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 sm:order-3"
                        >
                            Salvează preferințele
                        </button>
                    ) : (
                        <button
                            onClick={() =>
                                decide({ statistica: true, marketing: true })
                            }
                            className="order-1 rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 sm:order-3"
                        >
                            Acceptă toate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ title, desc, checked, disabled, onChange }) {
    return (
        <label className="flex items-start gap-3 text-xs">
            <input
                type="checkbox"
                className="mt-0.5 rounded border-gray-300 text-emerald-800 disabled:opacity-60"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.checked)}
            />
            <span>
                <span className="block font-semibold text-gray-900">
                    {title}
                </span>
                <span className="block text-gray-500">{desc}</span>
            </span>
        </label>
    );
}
