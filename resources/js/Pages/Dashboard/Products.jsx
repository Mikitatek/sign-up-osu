import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import { Head, router, useForm, usePage } from "@inertiajs/react";
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
    gramaj: "",
    category: "",
    price_lei: "",
    price_with_muschi_lei: "",
    options_text: "",
    one_option_text: "",
    is_active: true,
    is_limited_edition: false,
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

export default function Products({ products, categories, templates = [] }) {
    const { flash } = usePage().props;
    const [editing, setEditing] = useState(null); // null | 'new' | product
    const [toggling, setToggling] = useState(null);
    const [importing, setImporting] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [preview, setPreview] = useState(null); // { meta, state, data }
    const [activeMap, setActiveMap] = useState(
        Object.fromEntries(products.map((p) => [p.id, p.is_active])),
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
            gramaj: product.gramaj ?? "",
            category: product.category,
            price_lei: (product.price / 100).toFixed(2),
            price_with_muschi_lei: product.price_with_muschi
                ? (product.price_with_muschi / 100).toFixed(2)
                : "",
            options_text: (product.options ?? []).join("\n"),
            one_option_text: (product.one_option ?? []).join("\n"),
            is_active: product.is_active,
            is_limited_edition: product.is_limited_edition ?? false,
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
                },
            );
            if (res.ok) {
                setActiveMap((m) => ({ ...m, [product.id]: next }));
            }
        } finally {
            setToggling(null);
        }
    };

    const importWolt = () => {
        if (
            !window.confirm(
                "Import meniul de pe Wolt acum?\n\nSe actualizează produsele existente, se adaugă cele noi și se dezactivează ce nu mai e pe Wolt. Poate dura până la un minut.",
            )
        ) {
            return;
        }
        setImporting(true);
        router.post(
            route("dashboard.products.import-wolt"),
            {},
            {
                preserveScroll: true,
                onFinish: () => setImporting(false),
            },
        );
    };

    const saveTemplate = () => {
        const name = window.prompt(
            "Nume pentru acest meniu salvat:",
            "Meniu " + new Date().toLocaleDateString("ro-RO"),
        );
        if (name === null) return;
        router.post(
            route("dashboard.menu-templates.store"),
            { name },
            { preserveScroll: true },
        );
    };

    const restoreTemplate = (t) => {
        if (
            !window.confirm(
                `Restaurezi meniul „${t.name}” (${t.product_count} produse)?\n\n` +
                    "Produsele din template se suprascriu după slug, iar cele care nu sunt în template devin inactive. " +
                    "Meniul curent se salvează automat ca backup înainte de restaurare.",
            )
        ) {
            return;
        }
        router.post(
            route("dashboard.menu-templates.restore", t.id),
            {},
            { preserveScroll: true },
        );
    };

    const deleteTemplate = (t) => {
        if (window.confirm(`Ștergi template-ul „${t.name}”?`)) {
            router.delete(route("dashboard.menu-templates.destroy", t.id), {
                preserveScroll: true,
            });
        }
    };

    const openPreview = async (t) => {
        setPreview({ meta: t, state: "loading", data: null });
        try {
            const res = await fetch(
                route("dashboard.menu-templates.show", t.id),
                { headers: { Accept: "application/json" } },
            );
            if (!res.ok) throw new Error();
            setPreview({ meta: t, state: "ready", data: await res.json() });
        } catch {
            setPreview({ meta: t, state: "error", data: null });
        }
    };

    const renumber = () => {
        if (
            window.confirm(
                "Renumerotez ordinea tuturor produselor ca 10, 20, 30 …?\n\n" +
                    "Ordinea rămâne aceeași, dar rămân goluri ca să poți insera ușor produse între ele.",
            )
        ) {
            router.post(
                route("dashboard.products.renumber"),
                {},
                { preserveScroll: true },
            );
        }
    };

    const handleDelete = (product) => {
        if (
            window.confirm(
                `Ștergi definitiv produsul „${product.name}”? Va dispărea din magazin.`,
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
                    <div className="flex items-center gap-3">
                        <SecondaryButton
                            onClick={importWolt}
                            disabled={importing}
                        >
                            {importing
                                ? "Se importă din Wolt…"
                                : "⬇ Importă din Wolt"}
                        </SecondaryButton>
                        <PrimaryButton onClick={openCreate}>
                            + Adaugă produs
                        </PrimaryButton>
                    </div>
                </div>
            }
        >
            <Head title="Produse" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
                            {flash.error}
                        </div>
                    )}

                    <div className="mb-4 rounded-lg bg-white p-4 shadow-md">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowTemplates((v) => !v)}
                                className="text-sm font-semibold text-gray-800"
                            >
                                {showTemplates ? "▾" : "▸"} Meniuri salvate (
                                {templates.length})
                            </button>
                            <div className="flex gap-2">
                                <SecondaryButton onClick={renumber}>
                                    ↕ Renumerotează ordinea
                                </SecondaryButton>
                                <SecondaryButton onClick={saveTemplate}>
                                    💾 Salvează meniul curent
                                </SecondaryButton>
                            </div>
                        </div>

                        {showTemplates && (
                            <div className="mt-3 border-t border-gray-100 pt-3">
                                {templates.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        Niciun meniu salvat. Apasă „Salvează
                                        meniul curent" ca să faci un punct de
                                        restaurare.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {templates.map((t) => (
                                            <li
                                                key={t.id}
                                                className="flex items-center justify-between py-2 text-sm"
                                            >
                                                <span>
                                                    <span className="font-medium">
                                                        {t.name}
                                                    </span>
                                                    {t.auto && (
                                                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                                                            auto-backup
                                                        </span>
                                                    )}
                                                    <span className="ml-2 text-gray-400">
                                                        {t.created_at} ·{" "}
                                                        {t.product_count}{" "}
                                                        produse
                                                    </span>
                                                </span>
                                                <span className="whitespace-nowrap">
                                                    <button
                                                        onClick={() =>
                                                            openPreview(t)
                                                        }
                                                        className="mr-3 font-semibold text-gray-700 hover:underline"
                                                    >
                                                        👁 Vezi
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            restoreTemplate(t)
                                                        }
                                                        className="mr-3 font-semibold text-blue-700 hover:underline"
                                                    >
                                                        Restaurează
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            deleteTemplate(t)
                                                        }
                                                        className="font-bold text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {products.length === 0 ? (
                                <p className="text-gray-500">
                                    Niciun produs încă. Adaugă primul produs sau
                                    importă meniul de pe Wolt:{" "}
                                    <code className="rounded bg-gray-100 px-1">
                                        php artisan menu:import-wolt
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
                                                <th className="px-3 py-2 text-left">
                                                    Gramaj
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
                                                                {product.is_limited_edition && (
                                                                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                                                        Ediție
                                                                        limitată
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {product.category}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {product.gramaj || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">
                                                        {fmtLei(product.price)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {fmtLei(
                                                            product.price_with_muschi,
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
                                                                    product,
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
                                                                    product,
                                                                )
                                                            }
                                                            className="mr-3 font-semibold text-blue-700 hover:underline"
                                                        >
                                                            Editează
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    product,
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
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                        </Field>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]">
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

                        <Field label="Gramaj (opțional)" error={errors.gramaj}>
                            <input
                                type="text"
                                value={data.gramaj}
                                onChange={(e) =>
                                    setData("gramaj", e.target.value)
                                }
                                placeholder="200 g"
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
                                placeholder={
                                    "extra cașcaval (3 lei)\nextra mușchi (4 lei)"
                                }
                                className="w-full rounded-md border-gray-300 text-sm"
                            />
                            <span className="mt-1 block text-xs text-gray-500">
                                Scrie prețul între paranteze, ex.{" "}
                                <code>extra mușchi (4 lei)</code> — se adaugă la
                                prețul produsului când e bifat.
                            </span>
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
                            <span className="mt-1 block text-xs text-gray-500">
                                Mai mic = mai sus. Dacă numărul e deja folosit,
                                restul produselor se împing automat în jos — nu
                                trebuie să le renumerotezi manual.
                            </span>
                        </Field>

                        <div className="space-y-2">
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
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={data.is_limited_edition}
                                    onChange={(e) =>
                                        setData(
                                            "is_limited_edition",
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded border-gray-300"
                                />
                                Ediție limitată (secțiune separată, sus de tot)
                            </label>
                        </div>
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

            <Modal
                show={preview !== null}
                onClose={() => setPreview(null)}
                maxWidth="2xl"
            >
                {preview && (
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-gray-800">
                            {preview.meta.name}
                        </h2>
                        <p className="mb-4 text-xs text-gray-500">
                            {preview.meta.created_at} ·{" "}
                            {preview.meta.product_count} produse —
                            previzualizare, nu s-a modificat nimic
                        </p>

                        {preview.state === "loading" && (
                            <p className="py-8 text-center text-sm text-gray-500">
                                Se încarcă…
                            </p>
                        )}
                        {preview.state === "error" && (
                            <p className="py-8 text-center text-sm text-red-600">
                                Nu am putut încărca meniul.
                            </p>
                        )}

                        {preview.state === "ready" && (
                            <div className="max-h-[60vh] overflow-auto rounded border border-gray-100">
                                <table className="min-w-full text-xs">
                                    <thead className="sticky top-0 bg-gray-100">
                                        <tr>
                                            <th className="px-2 py-1.5 text-left">
                                                Produs
                                            </th>
                                            <th className="px-2 py-1.5 text-left">
                                                Categorie
                                            </th>
                                            <th className="px-2 py-1.5 text-left">
                                                Gramaj
                                            </th>
                                            <th className="px-2 py-1.5 text-right">
                                                Preț
                                            </th>
                                            <th className="px-2 py-1.5 text-center">
                                                Activ
                                            </th>
                                            <th className="px-2 py-1.5 text-right">
                                                Ord.
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.data.products.map((p, i) => (
                                            <tr
                                                key={i}
                                                className={`border-b border-gray-100 ${
                                                    p.is_active
                                                        ? ""
                                                        : "text-gray-400"
                                                }`}
                                            >
                                                <td className="px-2 py-1.5">
                                                    {p.name}
                                                    {p.is_limited_edition && (
                                                        <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-800">
                                                            EL
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {p.category}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {p.gramaj || "—"}
                                                </td>
                                                <td className="px-2 py-1.5 text-right">
                                                    {fmtLei(p.price)}
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    {p.is_active ? "✓" : "—"}
                                                </td>
                                                <td className="px-2 py-1.5 text-right">
                                                    {p.sort_order}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton
                                type="button"
                                onClick={() => setPreview(null)}
                            >
                                Închide
                            </SecondaryButton>
                            <PrimaryButton
                                onClick={() => {
                                    const t = preview.meta;
                                    setPreview(null);
                                    restoreTemplate(t);
                                }}
                            >
                                Restaurează acest meniu
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
