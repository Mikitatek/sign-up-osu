import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
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

function OrderCard({ order, onAccept, accepting }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{order.number}</span>
                <span className="text-sm text-gray-500">
                    {time(order.placed_at)}
                </span>
            </div>

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

            {onAccept ? (
                <button
                    onClick={() => onAccept(order)}
                    disabled={accepting}
                    className="mt-4 w-full rounded bg-emerald-800 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50"
                >
                    {accepting ? "Se acceptă..." : "Acceptă"}
                </button>
            ) : (
                <p className="mt-3 text-sm text-gray-500">
                    Acceptată la {time(order.accepted_at)}
                </p>
            )}
        </div>
    );
}

export default function Orders({ waiting, accepted }) {
    const [accepting, setAccepting] = useState(null);

    // Pagina rămâne deschisă în locație, deci comenzile noi apar singure.
    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ only: ["waiting", "accepted"] });
        }, REFRESH_MS);

        return () => clearInterval(timer);
    }, []);

    const accept = (order) => {
        router.post(
            route("dashboard.orders.accept", order.id),
            {},
            {
                preserveScroll: true,
                onBefore: () => setAccepting(order.id),
                onFinish: () => setAccepting(null),
            },
        );
    };

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
                    <section>
                        <h3 className="mb-3 text-lg font-bold">
                            De acceptat ({waiting.length})
                        </h3>
                        {waiting.length > 0 ? (
                            <div className="space-y-4">
                                {waiting.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onAccept={accept}
                                        accepting={accepting === order.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">
                                Nicio comandă în așteptare.
                            </p>
                        )}
                    </section>

                    {accepted.length > 0 && (
                        <section>
                            <h3 className="mb-3 text-lg font-bold">
                                Acceptate recent
                            </h3>
                            <div className="space-y-4">
                                {accepted.map((order) => (
                                    <OrderCard key={order.id} order={order} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
