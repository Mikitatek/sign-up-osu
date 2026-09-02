import React, { useState } from "react";

import logo from "../../assets/osu-logo-site.svg";
import { usePage } from "@inertiajs/react";

export default function Navbar({ totalItemCount, subtotal, setIsCartOpen }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { url } = usePage();

    // ✅ Show cart on these routes:
    const CART_ROUTES = ["/magazin", "/editie-speciala"];
    const isCartRoute = CART_ROUTES.some((prefix) => url.startsWith(prefix));

    const handleScrollToSection = (id) => {
        const section = document.getElementById(id);
        if (section) {
            const offset = 130;
            const top =
                section.getBoundingClientRect().top +
                window.pageYOffset -
                offset;

            window.scrollTo({ top, behavior: "smooth" });
            setIsMenuOpen(false);
        }
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-gray-100 shadow-md">
                <div className="flex items-center justify-between md:grid md:grid-cols-10 px-6 py-1">
                    <div className="md:col-span-2"></div>

                    {/* Logo */}

                    <div className="flex-1 flex justify-center md:justify-start md:col-span-5 py-2">
                        <a href="/">
                            <img src={logo} alt="Osu Logo" className="w-32" />
                        </a>
                    </div>

                    {/* Cart button desktop */}
                    {/* {isCartRoute && (
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 font-bold hidden md:block md:col-span-1"
                        >
                            Coș ({totalItemCount})
                        </button>
                    )}

                    
                    {isCartRoute && (
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="fixed bottom-6 right-6 z-40 bg-red-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-red-700 font-bold text-lg flex items-center gap-2 md:hidden"
                        >
                            Coș ({totalItemCount})
                            {totalItemCount > 0 && (
                                <span>{(subtotal / 100).toFixed(2)} RON</span>
                            )}
                        </button>
                    )}

                    {isCartRoute && (
                        <div className="absolute right-1 top-3 md:hidden z-50">
                            <button
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                className="relative w-12 h-12 flex flex-col justify-center items-center p-1 group"
                            >
                                <span
                                    className={`w-6 h-0.5 bg-gray-800 rounded transform transition duration-300 ease-in-out ${
                                        isMenuOpen
                                            ? "rotate-45 translate-y-1.5"
                                            : ""
                                    }`}
                                ></span>
                                <span
                                    className={`w-6 h-0.5 bg-gray-800 rounded my-1 transition duration-300 ease-in-out ${
                                        isMenuOpen ? "opacity-0" : ""
                                    }`}
                                ></span>
                                <span
                                    className={`w-6 h-0.5 bg-gray-800 rounded transform transition duration-300 ease-in-out ${
                                        isMenuOpen
                                            ? "-rotate-45 -translate-y-1.5"
                                            : ""
                                    }`}
                                ></span>
                            </button>
                        </div>
                    )} */}

                    {/* Meniu mobil dropdown */}
                    {isMenuOpen && (
                        <div className="absolute top-14 right-4 bg-white border border-gray-200 shadow-lg rounded z-50 w-40 md:hidden">
                            <ul className="flex flex-col">
                                <li>
                                    <button
                                        onClick={() =>
                                            handleScrollToSection("contact")
                                        }
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                    >
                                        Contact
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() =>
                                            handleScrollToSection("locatie")
                                        }
                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                    >
                                        Locație
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Bară contact desktop */}
                <div className="hidden md:block w-full bg-red-500 text-white text-center py-1 text-sm font-bold">
                    Comenzi telefonice: 0723 758 663
                </div>
                {/* Bară contact mobil */}
                <a href="tel:+40723758663">
                    <div className="block md:hidden bg-red-500 sticky top-[75px] z-40 px-4 py-1 text-center font-bold">
                        <h2 className="text-sm text-white md:text-md">
                            Comenzi telefonice: 0723 758 663
                        </h2>
                    </div>
                </a>
            </header>
        </>
    );
}
