// resources/js/Pages/Dashboard/Products.jsx
import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function Products({ products }) {
    const [items, setItems] = useState(products);

    const toggle = async (id, next) => {
        try {
            const res = await fetch("/dashboard/products/toggle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                },
                body: JSON.stringify({
                    stripe_product_id: id,
                    is_active: next,
                }),
            });
            if (!res.ok) throw new Error("Request failed");

            setItems((prev) =>
                prev.map((p) => (p.id === id ? { ...p, is_active: next } : p))
            );
        } catch (e) {
            console.error(e);
            alert("Nu s-a putut salva. Încearcă din nou.");
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Products
                </h2>
            }
        >
            <Head title="Products" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b">
                                        <th className="py-3 pr-4">Produs</th>
                                        <th className="py-3 pr-4">Categorie</th>
                                        <th className="py-3 pr-4">Status</th>
                                        <th className="py-3 pr-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-3 pr-4 flex items-center gap-3">
                                                <img
                                                    src={p.image}
                                                    alt={p.name}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                                <div>
                                                    <div className="font-medium">
                                                        {p.name}
                                                    </div>
                                                    {p.description && (
                                                        <div className="text-gray-500 text-xs line-clamp-1">
                                                            {p.description}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-gray-400">
                                                        {p.id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {p.category}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span
                                                    className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                                                        p.is_active
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-gray-200 text-gray-700"
                                                    }`}
                                                >
                                                    {p.is_active
                                                        ? "Activ"
                                                        : "Ascuns"}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <button
                                                    onClick={() =>
                                                        toggle(
                                                            p.id,
                                                            !p.is_active
                                                        )
                                                    }
                                                    className={`px-3 py-1 rounded font-semibold ${
                                                        p.is_active
                                                            ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                                                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    }`}
                                                >
                                                    {p.is_active
                                                        ? "Dezactivează"
                                                        : "Activează"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                className="py-10 text-center text-gray-500"
                                            >
                                                Niciun produs.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-400 mt-4">
                            * Produsele dezactivate nu apar pe pagina „Magazin”.
                        </p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
