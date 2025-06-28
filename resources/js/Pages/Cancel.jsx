import React from "react";
import SiteLayout from "@/Layouts/SiteLayout";

export default function Cancel() {
    return (
        <SiteLayout>
            <div className="bg-yellow-50 min-h-screen flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold text-yellow-700 mb-4">
                        ⚠️ Plata a fost anulată
                    </h1>
                    <p className="text-gray-700 mb-4">
                        Comanda nu a fost procesată. Poți încerca din nou
                        oricând.
                    </p>
                    <a
                        href="/magazin"
                        className="text-sm text-yellow-700 underline hover:text-red-500"
                    >
                        Înapoi la magazin
                    </a>
                </div>
            </div>
        </SiteLayout>
    );
}
