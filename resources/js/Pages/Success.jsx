import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";

export default function Success() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [emailSent, setEmailSent] = useState(false);

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
                    const local = localStorage.getItem("osu_order_data");
                    if (!local) {
                        setError("Datele comenzii lipsesc.");
                        return;
                    }

                    const order = JSON.parse(local);

                    const emailData = {
                        name: order.formData.name,
                        phone: order.formData.phone,
                        email: order.formData.email,
                        deliveryType: order.formData.deliveryType,
                        paymentMethod: order.formData.paymentMethod,
                        street: order.formData.street,
                        apartment: order.formData.apartment,
                        staircase: order.formData.staircase,
                        floor: order.formData.floor,
                        city: order.formData.city,
                        notes: order.formData.notes,
                        scheduledDate: order.formData.scheduledDate || "azi",
                        scheduledTime:
                            order.formData.scheduledTime ||
                            "Cât de repede posibil",
                        items: order.items
                            .map((item) => {
                                const originalTotal =
                                    (item.qty * item.price) / 100;
                                const discountedTotal =
                                    originalTotal *
                                    ((100 - order.discount) / 100);

                                if (order.discount > 0) {
                                    return `${item.name} (${item.option}) x ${
                                        item.qty
                                    } = ${discountedTotal.toFixed(
                                        2
                                    )} RON (redus din ${originalTotal.toFixed(
                                        2
                                    )} RON, -${order.discount}%)`;
                                } else {
                                    return `${item.name} (${item.option}) x ${
                                        item.qty
                                    } = ${originalTotal.toFixed(2)} RON`;
                                }
                            })
                            .join("\n"),
                        total: (order.total / 100).toFixed(2),
                    };

                    emailjs
                        .send(
                            "service_wz043lj",
                            "template_fx2v89x",
                            emailData,
                            "xweu0E67NPFqknP_c"
                        )
                        .then(
                            () => {
                                setEmailSent(true);
                                localStorage.removeItem("osu_cart");
                                localStorage.removeItem("osu_order_data");
                            },
                            (err) => {
                                console.error("EmailJS error:", err);
                                setError("Eroare la trimiterea emailului.");
                            }
                        );
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
                            {emailSent && (
                                <p className="text-sm text-gray-500">
                                    Confirmarea a fost trimisă pe email.
                                </p>
                            )}
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
