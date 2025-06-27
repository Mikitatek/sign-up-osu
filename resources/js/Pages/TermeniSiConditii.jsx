import React from "react";
import { usePage } from "@inertiajs/react";
import { Link } from "@inertiajs/react"; // Import Inertia's Link for navigation
import logo from "../../assets/logo.svg";
import BackButton from "@/Components/BackButton";
import SiteLayout from "@/Layouts/SiteLayout";
import Footer from "@/Components/Footer";

export default function TermeniSiConditii() {
    const { terms } = usePage().props; // Get the terms passed from the backend

    return (
        <SiteLayout>
            <div className="max-w-3xl mx-4 my-10 p-6 pt-24 rounded-lg md:mx-auto md:px-8">
                {/* Back Button with Icon and Text "Înapoi" */}
                <BackButton />

                {/* Generic Tailwind styling applied to the content */}
                <div className="terms-content my-4">
                    <div
                        className="terms-content"
                        dangerouslySetInnerHTML={{ __html: terms }} // Inject raw HTML
                    ></div>
                </div>

                <BackButton className="mt-6" />
            </div>
        </SiteLayout>
    );
}
