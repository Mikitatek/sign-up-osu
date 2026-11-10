import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";

const REFRESH_MS = 30000;

const lei = (bani) => `${(bani / 100).toFixed(2)} RON`;

const time = (iso) =>
    iso
        ? new Date(iso).toLocaleString("ro-RO", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";

const STATUS_STYLES = {
    placed: "bg-red-100 text-red-800",
    accepted: "bg-amber-100 text-amber-800",
    preparing: "bg-amber-100 text-amber-800",
    ready: "bg-sky-100 text-sky-800",
    out_for_delivery: "bg-sky-100 text-sky-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-gray-200 text-gray-700",
};

function OrderCard({ order }) {
    const [busy, setBusy] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [reasonError, setReasonError] = useState("");

    // Cât timp e „Plasată”, anularea înseamnă refuzul comenzii.
    const declining = order.status === "placed";

    const post = (name, data) =>
        router.post(route(name, order.id), data, {
            preserveScroll: true,
            onBefore: () => setBusy(true),
            onFinish: () => setBusy(false),
            onError: (errors) => setReasonError(errors.reason || ""),
        });

    const confirmCancel = () => {
        if (!reason.trim()) {
            setReasonError("Scrie motivul, clientul îl primește pe email.");
            return;
        }
        setReasonError("");
        post("dashboard.orders.cancel", { reason: reason.trim() });
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{order.number}</span>
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[order.status] || "bg-gray-100"
                    }`}
                >
                    {order.status_label}
                </span>
            </div>
            <p className="text-sm text-gray-500">
                Plasată la {time(order.placed_at)}
            </p>

            <p className="mt-1 text-sm text-gray-700">
                {order.payment_method === "card" ? "Card (plătit)" : "Numerar"}{" "}
                · <span className="font-semibold">{lei(order.total)}</span>
            </p>

            <ul className="mt-3 text-sm">
                {order.items.map((item, index) => (
                    <li key={index}>
                        {item.quantity} × {item.name}
                        {item.option && item.option !== "-"
                            ? ` (${item.option})`
                            : ""}
                    </li>
                ))}
            </ul>

            <div className="mt-3 text-sm text-gray-700">
                <p>
                    {order.contact_name} ·{" "}
                    <a
                        href={`tel:${order.contact_phone}`}
                        className="text-emerald-800 underline"
                    >
                        {order.contact_phone}
                    </a>
                </p>
                <p>
                    {order.delivery_type === "ridicare"
                        ? "Ridicare personală"
                        : `Livrare: ${order.address}`}
                </p>
                <p>Când: {order.schedule}</p>
                {order.notes && <p>Observații: {order.notes}</p>}
            </div>

            {order.status === "cancelled" && (
                <div className="mt-3 rounded bg-gray-50 p-2 text-sm text-gray-700">
                    <p>Motiv: {order.cancellation_reason}</p>
                    {order.refunded && (
                        <p>Plata a fost returnată pe card.</p>
                    )}
                </div>
            )}

            {order.finished_at && (
                <p className="mt-3 text-sm text-gray-500">
                    {order.status_label} la {time(order.finished_at)}
                </p>
            )}

            {order.next_action && !cancelOpen && (
                <button
                    onClick={() =>
                        post("dashboard.orders.advance", {
                            from: order.status,
                        })
                    }
                    disabled={busy}
                    className="mt-4 w-full rounded bg-emerald-800 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50"
                >
                    {busy ? "Se salvează..." : order.next_action}
                </button>
            )}

            {order.can_cancel &&
                (cancelOpen ? (
                    <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
                        <label className="block text-sm font-semibold text-gray-800">
                            {declining
                                ? "Motivul refuzului"
                                : "Motivul anulării"}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={500}
                            rows={2}
                            disabled={busy}
                            className="mt-1 w-full rounded border-gray-300 text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-600">
                            Clientul primește motivul pe email.
                            {order.payment_method === "card" &&
                                " Plata cu cardul i se returnează automat."}
                        </p>
                        {reasonError && (
                            <p className="mt-1 text-sm text-red-600">
                                {reasonError}
                            </p>
                        )}
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={confirmCancel}
                                disabled={busy}
                                className="flex-1 rounded bg-red-600 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {declining
                                    ? "Confirmă refuzul"
                                    : "Confirmă anularea"}
                            </button>
                            <button
                                onClick={() => {
                                    setCancelOpen(false);
                                    setReasonError("");
                                }}
                                disabled={busy}
                                className="flex-1 rounded border border-gray-300 bg-white py-2 font-semibold text-gray-700"
                            >
                                Renunță
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setCancelOpen(true)}
                        disabled={busy}
                        className="mt-2 w-full rounded border border-red-300 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                        {declining ? "Refuză comanda" : "Anulează comanda"}
                    </button>
                ))}
        </div>
    );
}

function Section({ title, orders, empty }) {
    return (
        <section>
            <h3 className="mb-3 text-lg font-bold">
                {title} ({orders.length})
            </h3>
            {orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <OrderCard key={order.id} order={order} />
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">{empty}</p>
            )}
        </section>
    );
}

export default function Orders({ waiting, active, finished }) {
    const { flash } = usePage().props;

    // Pagina rămâne deschisă în locație, deci comenzile noi apar singure.
    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ only: ["waiting", "active", "finished"] });
        }, REFRESH_MS);

        return () => clearInterval(timer);
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Comenzi
                </h2>
            }
        >
            <Head title="Comenzi" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6 lg:px-8">
                    {flash?.error && (
                        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">
                            {flash.error}
                        </div>
                    )}

                    <Section
                        title="De acceptat"
                        orders={waiting}
                        empty="Nicio comandă în așteptare."
                    />
                    <Section
                        title="În lucru"
                        orders={active}
                        empty="Nicio comandă în lucru."
                    />
                    {finished.length > 0 && (
                        <Section
                            title="Finalizate și anulate recent"
                            orders={finished}
                        />
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
