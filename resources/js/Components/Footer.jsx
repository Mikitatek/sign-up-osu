import React from "react";
import logo from "../../assets/osu-logo-site.svg";

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-gray-300 px-6 py-12 text-sm">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Col 1: Info */}
                <div>
                    <img src={logo} alt="Osu Logo" className="mb-4 w-40" />
                    <ul className="text-gray-400 space-y-1">
                        <li>CUI: 50260074</li>
                        <li>Nr.Reg.Com: J8/1949/2024</li>
                        <li>
                            Adresa: Municipiul Brașov, Str. CARPAȚILOR, Nr.93,
                            Bloc 17, Ap.65, Județ Brașov
                        </li>
                    </ul>

                    <div className="flex gap-8 mt-4 text-white text-3xl">
                        <a
                            href="https://www.facebook.com/profile.php?id=61567285510167"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="fab fa-facebook-f"></i>
                        </a>
                        <a
                            href="https://www.instagram.com/batranul.osu/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a
                            href="https://www.tiktok.com/@batranul.osu"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="fab fa-tiktok"></i>
                        </a>
                    </div>
                </div>

                {/* Col 2: Categorii */}
                <div>
                    <h3 className="text-white font-semibold mb-4">Comandă</h3>
                    <ul className="space-y-2">
                        <li>
                            <a href="/magazin" className="hover:underline">
                                Kurtos
                            </a>
                        </li>
                        <li>
                            <a href="/magazin" className="hover:underline">
                                Langos
                            </a>
                        </li>
                        <li>
                            <a href="/magazin" className="hover:underline">
                                Băuturi
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Col 3: Contact */}
                <div>
                    <h3 className="text-white font-semibold mb-4">Contact</h3>
                    <ul>
                        <li className="mb-2">Str. Egretei Nr.1, Brașov</li>
                        <li className="mb-2">L-D: 10:00–22:00</li>
                        <a href="mailto:contact@batranu-osu.ro">
                            <li className="mb-2">contact@batranu-osu.ro</li>
                        </a>
                        <a href="tel:+40723758663">
                            <li className="mb-2">0723 758 663</li>
                        </a>
                    </ul>
                </div>
            </div>

            {/* Subsol */}
            <div className="mt-10 border-t border-neutral-700 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() =>
                            (window.location.href = "/termeni-si-conditii")
                        }
                        className="px-3 py-1 border border-transparent hover:border-gray-300 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                    >
                        Termeni și condiții
                    </button>
                    <button
                        onClick={() =>
                            (window.location.href = "/termeni-si-conditii")
                        }
                        className="px-3 py-1 border border-transparent hover:border-gray-300 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                    >
                        Politica Cookies
                    </button>
                    <button
                        onClick={() =>
                            (window.location.href = "/termeni-si-conditii")
                        }
                        className="px-3 py-1 border border-transparent hover:border-gray-300 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100  transition"
                    >
                        Politica de confidențialitate
                    </button>
                    <button
                        onClick={() =>
                            (window.location.href = "/valori-nutritionale")
                        }
                        className="px-3 py-1 border border-transparent hover:border-gray-300 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                    >
                        Valori Nutriționale
                    </button>
                </div>

                <div className="flex gap-4">
                    <a
                        href="https://anpc.ro/ce-este-sal/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <img
                            src="/img/sal.png"
                            alt="ANPC SAL"
                            className="md:h-16 h-8"
                        />
                    </a>
                    <a
                        href="https://ec.europa.eu/consumers/odr/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <img
                            src="/img/sol.png"
                            alt="SOL"
                            className="md:h-16 h-8"
                        />
                    </a>
                </div>
            </div>
        </footer>
    );
}
