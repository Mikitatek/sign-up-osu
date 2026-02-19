import React from "react";
import SiteLayout from "@/Layouts/SiteLayout";

export default function Error404() {
    return (
        <SiteLayout>
            <div className="bg-yellow-50 min-h-screen flex items-center justify-center py-16">
                <div className="max-w-xl mx-auto bg-white/90 rounded-2xl shadow-lg p-8 text-center border border-yellow-100">
                    <p className="text-xs tracking-[0.25em] uppercase text-yellow-600 mb-2">
                        EROARE 404
                    </p>

                    <h1 className="text-3xl md:text-4xl font-bold text-yellow-800 mb-3">
                        Ups… te-ai rătăcit printre cozonaci 🥹
                    </h1>

                    <p className="text-gray-700 mb-6">
                        Pagina pe care o cauți nu mai există sau nu a fost
                        niciodată coaptă. Dar magazinul e încă plin de bunătăți.
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center">
                        <a
                            href="/magazin"
                            className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold bg-yellow-700 text-white hover:bg-yellow-800 transition"
                        >
                            Înapoi la magazin
                        </a>

                        <a
                            href="/"
                            className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border border-yellow-700 text-yellow-700 hover:bg-yellow-50 transition"
                        >
                            Mergi pe pagina principală
                        </a>
                    </div>

                    <div className="mt-6 text-xs text-gray-500">
                        Batranul Osu — #gustulcopilăriei
                    </div>
                </div>
            </div>
        </SiteLayout>
    );
}
