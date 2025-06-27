import ApplicationLogo from "@/Components/ApplicationLogo";
import { Link } from "@inertiajs/react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

export default function GuestLayout({
    children,
    totalItemCount,
    subtotal,
    setIsCartOpen,
}) {
    return (
        <>
            <div className="min-h-screen  font-sans text-gray-800 shadow-md">
                <div className="w-full max-w-6xl mx-auto bg-white">
                    <Navbar
                        totalItemCount={totalItemCount}
                        subtotal={subtotal}
                        setIsCartOpen={setIsCartOpen}
                    />
                    {children} <Footer />
                </div>
            </div>
        </>
    );
}
