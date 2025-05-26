import React, { useState } from "react";
import { useForm, Link } from "@inertiajs/react";
import logo from "../../assets/logo.svg";
import BackButton from "@/Components/BackButton";

export default function NewsletterSignUp() {
    // Form state management
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        email: "",
        phone: "",
        gdpr: false,
        newsletter_agreement: false,
    });

    const [success, setSuccess] = useState(false);

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        post("/newsletter-signup", {
            onSuccess: () => {
                setSuccess(true);
            },
        });
    };

    return (
        <div className="h-screen bg-cover bg-center flex flex-col items-center justify-start pt-10 md:pt-20 font-montserrat">
            <div className="text-center">
                <img src={logo} alt="Logo" className="w-32 h-32 mx-auto mb-5" />
            </div>

            <div className="max-w-lg mx-4 mt-10 p-4 bg-white shadow-md rounded-lg md:mx-auto md:px-8">
                {/* Show the success message if the form has been successfully submitted */}
                {success ? (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-emerald-800 mb-4">
                            Formularul a fost trimis.
                        </h1>
                        <p className="text-gray-700">
                            Înscrierea ta a fost înregistrată cu succes. Vei
                            primi în curând informații despre oferte, servicii
                            și evenimente.
                        </p>
                        <BackButton className="mt-6" />
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-center mb-6 mt-3">
                            Curios? Înscrie-te și află primul despre ce e vorba.
                        </h1>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label
                                    htmlFor="name"
                                    className="block text-gray-700"
                                >
                                    Nume:
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData("name", e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
                                />
                                {errors.name && (
                                    <span className="text-red-500 text-sm">
                                        {errors.name}
                                    </span>
                                )}
                            </div>

                            <div className="mb-4">
                                <label
                                    htmlFor="email"
                                    className="block text-gray-700"
                                >
                                    Email:
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData("email", e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
                                />
                                {errors.email && (
                                    <span className="text-red-500 text-sm">
                                        {errors.email}
                                    </span>
                                )}
                            </div>

                            <div className="mb-4">
                                <label
                                    htmlFor="phone"
                                    className="block text-gray-700"
                                >
                                    Telefon:
                                </label>
                                <input
                                    id="phone"
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) =>
                                        setData("phone", e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-800"
                                />
                                {errors.phone && (
                                    <span className="text-red-500 text-sm">
                                        {errors.phone}
                                    </span>
                                )}
                            </div>

                            <div className="mb-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.gdpr}
                                        onChange={(e) =>
                                            setData("gdpr", e.target.checked)
                                        }
                                        className="form-checkbox text-emerald-800"
                                    />
                                    <span className="ml-2 text-gray-700">
                                        Sunt de acord cu{" "}
                                        <Link
                                            href={route("termeni-si-conditii")}
                                            className="text-emerald-800 hover:underline"
                                        >
                                            Termeni și Condiții, Politica de
                                            Confidențialitate
                                        </Link>
                                        .
                                    </span>
                                </label>
                                {errors.gdpr && (
                                    <span className="text-red-500 text-sm">
                                        {errors.gdpr}
                                    </span>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.newsletter_agreement}
                                        onChange={(e) =>
                                            setData(
                                                "newsletter_agreement",
                                                e.target.checked
                                            )
                                        }
                                        className="form-checkbox text-emerald-800"
                                    />
                                    <span className="ml-2 text-gray-700">
                                        Sunt de acord să primesc newsletterele
                                        cu informații despre oferte, servicii și
                                        evenimente Oșu.
                                    </span>
                                </label>
                                {errors.newsletter_agreement && (
                                    <span className="text-red-500 text-sm">
                                        {errors.newsletter_agreement}
                                    </span>
                                )}
                            </div>

                            <div className="text-center">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-emerald-800 text-white py-2 px-4 rounded-md hover:bg-red-500 disabled:opacity-50 font-bold"
                                >
                                    Trimite
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
