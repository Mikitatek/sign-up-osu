import React, { useEffect, useState } from "react";
import SiteLayout from "@/Layouts/SiteLayout";

export default function Success() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");

        if (!sessionId) {
            setError("A aparut o eroare.");
            setLoading(false);
            return;
        }

        fetch(`/api/stripe/success?session_id=${sessionId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    localStorage.removeItem("osu_cart");
                } else {
                    setError(data.error || "Plata nu a fost confirmată.");
                }
            })
            .catch(() => {
                setError("A apărut o eroare la verificarea plății.");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-green-50 min-h-screen flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="font-bold text-gray-700 mb-4">
                        Se verifică plata...
                    </h1>
                </div>
            </div>
        );
    }

    return (
        <SiteLayout>
            <div className="bg-green-50 min-h-screen flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    {error ? (
                        <>
                            <h1 className="text-2xl font-bold text-red-600 mb-4">
                                ❌ Eroare
                            </h1>
                            <p className="text-gray-700">{error}</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-green-700 mb-4">
                                ✅ Plata a fost procesată cu succes!
                            </h1>
                            <p className="text-gray-700 mb-4">
                                Mulțumim pentru comanda ta. Ne apucăm de treabă
                                imediat! 🥨
                            </p>
                            <p className="text-sm text-gray-500">
                                Vei primi confirmarea pe email.
                            </p>
                        </>
                    )}
                    <a
                        href="/magazin"
                        className="text-sm text-emerald-700 underline hover:text-red-500 mt-4 inline-block"
                    >
                        Înapoi la magazin
                    </a>
                </div>
            </div>
        </SiteLayout>
    );
}
