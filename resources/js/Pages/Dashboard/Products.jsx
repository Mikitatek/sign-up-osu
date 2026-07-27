import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import { Head, router, useForm } from "@inertiajs/react";
import { useState } from "react";

const fmtLei = (bani) =>
    bani == null
        ? "—"
        : new Intl.NumberFormat("ro-RO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          }).format(bani / 100);

const csrf = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

const emptyForm = {
    name: "",
    description: "",
    category: "",
    price_lei: "",
    price_with_muschi_lei: "",
    options_text: "",
    one_option_text: "",
    is_active: true,
    sort_order: 0,
    image: null,
};

function Field({ label, error, children }) {
    return (
        <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
                {label}
            </span>
            {children}
            <InputError message={error} className="mt-1" />
        </label>
    );
}

export default function Products({ products, categories }) {
    const [editing, setEditing] = useState(null); // null | 'new' | product
    const [toggling, setToggling] = useState(null);
    const [activeMap, setActiveMap] = useState(
        Object.fromEntries(products.map((p) => [p.id, p.is_active]))
    );

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    const openCreate = () => {
        reset();
        clearErrors();
        setData(emptyForm);
        setEditing("new");
    };

    const openEdit = (product) => {
        clearErrors();
        setData({
            name: product.name,
            description: product.description ?? "",
            category: product.category,
            price_lei: (product.price / 100).toFixed(2),
            price_with_muschi_lei: product.price_with_muschi
                ? (product.price_with_muschi / 100).toFixed(2)
                : "",
            options_text: (product.options ?? []).join("\n"),
            one_option_text: (product.one_option ?? []).join("\n"),
            is_active: product.is_active,
            sort_order: product.sort_order,
            image: null,
        });
        setEditing(product);
    };

    const submit = (e) => {
        e.preventDefault();
        const url =
            editing === "new"
                ? route("dashboard.products.store")
                : route("dashboard.products.update", editing.id);
        post(url, {
            forceFormData: true,
            onSuccess: () => setEditing(null),
        });
    };

    const toggleActive = async (product) => {
        const next = !activeMap[product.id];
        setToggling(product.id);
        try {
            const res = await fetch(
                route("dashboard.products.toggle", product.id),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrf(),
                    },
                    body: JSON.stringify({ is_active: next }),
                }
            );
            if (res.ok) {
                setActiveMap((m) => ({ ...m, [product.id]: next }));
            }
        } finally {
            setToggling(null);
        }
    };

    const handleDelete = (product) => {
        if (
            window.confirm(
                `Ștergi definitiv produsul „${product.name}”? Va dispărea din magazin.`
            )
        ) {
            router.delete(route("dashboard.products.destroy", product.id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Produse — catalog local
                    </h2>
                    <PrimaryButton onClick={openCreate}>
                        + Adaugă produs
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Produse" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {products.length === 0 ? (
                                <p className="text-gray-500">
                                    Niciun produs încă. Adaugă primul produs sau
                                    rulează importul din Stripe:{" "}
                                    <code className="rounded bg-gray-100 px-1">
                                        php artisan products:import-stripe
                                    </code>
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full table-auto text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left">
                                                    Produs
                                                </th>
                                                <th className="px-3 py-2 text-left">
                                                    Categorie
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    Preț (lei)
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    Cu mușchi (lei)
                                                </th>
                                                <th className="px-3 py-2 text-center">
                                                    Opțiuni
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    Ordine
                                                </th>
                                                <th className="px-3 py-2 text-center">
                                                    Activ
                                                </th>
                                                <th className="px-3 py-2 text-center">
                                                    Acțiuni
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((product) => (
                                                <tr
                                                    key={product.id}
                                                    className={`border-b hover:bg-gray-50 ${
                                                        activeMap[product.id]
                                                            ? ""
                                                            : "opacity-50"
                                                    }`}
                                                >
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={
                                                                    product.image ||
                                                                    "/images/default.jpg"
                                                                }
                                                                alt=""
                                                                className="h-10 w-10 rounded object-cover"
                                                            />
                                                            <span className="font-medium">
                                                                {product.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {product.category}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        {fmtLei(product.price)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {fmtLei(
                                                            product.price_with_muschi
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-gray-500">
                                                        {(product.options ?? [])
                                                            .length +
                                                            (
                                                                product.one_option ??
                                                                []
                                                            ).length || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {product.sort_order}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            onClick={() =>
                                                                toggleActive(
                                                                    product
                                                                )
                                                            }
                                                            disabled={
                                                                toggling ===
                                                                product.id
                                                            }
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                                                activeMap[
                                                                    product.id
                                                                ]
                                                                    ? "bg-green-600"
                                                                    : "bg-gray-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                                    activeMap[
                                                                        product
                                                                            .id
                                                                    ]
                                                                        ? "translate-x-6"
                                                                        : "translate-x-1"
                                                                }`}
                                                            />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                                        <button
                                                            onClick={() =>
                                                                openEdit(
                                                                    product
                                                                )
                                                            }
                                                            className="mr-3 font-semibold text-blue-700 hover:underline"
                                                        >
                                                            Editează
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    product
                                                                )
                                                            }
                                                            className="font-bold text-red-600 hover:text-red-800"
                                                        >
                                                            X
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal show={editing !== null} onClose={() => setEditing(null)}>
                <form onSubmit={submit} className="p-6">
                    <h2 className="mb-4 text-lg font-bold text-gray-800">
                        {editing === "new"
                            ? "Adaugă produs"
                            : `Editează: ${editing?.name ?? ""}`}
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nume" error={errors.name}>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                                required
                            />
                        </Field>

                        <Field label="Categorie" error={errors.category}>
                            <input
                                type="text"
                                list="product-categories"
                                value={data.category}
                                onChange={(e) =>
                                    setData("category", e.target.value)
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                                required
                            />
                            <datalist id="product-categories">
                                {categories.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </Field>

                        <Field label="Preț (lei)" error={errors.price_lei}>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={data.price_lei}
                                onChange={(e) =>
                                    setData("price_lei", e.target.value)
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                                required
                            />
                        </Field>

                        <Field
                            label="Preț cu mușchi (lei, opțional)"
                            error={errors.price_with_muschi_lei}
                        >
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={data.price_with_muschi_lei}
                                onChange={(e) =>
                                    setData(
                                        "price_with_muschi_lei",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                        </Field>
                    </div>

                    <div className="mt-4">
                        <Field label="Descriere" error={errors.description}>
                            <textarea
                                rows={3}
                                value={data.description}
                                onChange={(e) =>
                                    setData("description", e.target.value)
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                        </Field>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Extra-uri bifabile (unul pe linie)"
                            error={errors.options_text}
                        >
                            <textarea
                                rows={4}
                                value={data.options_text}
                                onChange={(e) =>
                                    setData("options_text", e.target.value)
                                }
                                placeholder={"extra cașcaval\nextra mușchi"}
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                        </Field>

                        <Field
                            label="Alegere unică (una pe linie)"
                            error={errors.one_option_text}
                        >
                            <textarea
                                rows={4}
                                value={data.one_option_text}
                                onChange={(e) =>
                                    setData("one_option_text", e.target.value)
                                }
                                placeholder={"simplu\ncu mușchi"}
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                        </Field>
                    </div>

                    <div className="mt-4 grid items-end gap-4 sm:grid-cols-3">
                        <Field label="Imagine" error={errors.image}>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) =>
                                    setData("image", e.target.files[0])
                                }
                                className="w-full text-sm"
                            />
                            {editing !== "new" && editing?.image && (
                                <img
                                    src={editing.image}
                                    alt=""
                                    className="mt-2 h-14 w-14 rounded object-cover"
                                />
                            )}
                        </Field>

                        <Field label="Ordine afișare" error={errors.sort_order}>
                            <input
                                type="number"
                                min="0"
                                value={data.sort_order}
                                onChange={(e) =>
                                    setData("sort_order", e.target.value)
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                        </Field>

                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) =>
                                    setData("is_active", e.target.checked)
                                }
                                className="rounded border-gray-300"
                            />
                            Activ în magazin
                        </label>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton
                            type="button"
                            onClick={() => setEditing(null)}
                        >
                            Renunță
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing
                                ? "Se salvează…"
                                : editing === "new"
                                  ? "Adaugă produsul"
                                  : "Salvează modificările"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
