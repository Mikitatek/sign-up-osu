import React from "react";
import { usePage } from "@inertiajs/react";
import { Link } from "@inertiajs/react"; // Import Inertia's Link for navigation
import logo from "../../assets/logo.svg";
import BackButton from "@/Components/BackButton";

export default function TermeniSiConditii() {
    const { terms } = usePage().props; // Get the terms passed from the backend

    return (
        <div className="min-h-screen bg-cover bg-center flex flex-col items-center justify-start pt-20 font-montserrat">
            <div className="text-center">
                <img src={logo} alt="Logo" className="w-32 h-32 mx-auto mb-5" />
            </div>

            <div className="max-w-3xl mx-4 my-10 p-6 bg-white shadow-md rounded-lg md:mx-auto md:px-8">
                {/* Back Button with Icon and Text "Înapoi" */}
                <BackButton className="mb-6" />

                {/* Title "Termeni și Condiții" */}
                <h1 className="text-3xl font-bold mb-4">Termeni și Condiții</h1>

                {/* Generic Tailwind styling applied to the content */}
                <div className="terms-content">
                    <div
                        className="terms-content"
                        dangerouslySetInnerHTML={{ __html: terms }} // Inject raw HTML
                    ></div>
                </div>

                <BackButton className="mt-6" />
            </div>
        </div>
    );
}
