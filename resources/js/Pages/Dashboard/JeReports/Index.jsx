import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import PrimaryButton from "@/Components/PrimaryButton";
import InputError from "@/Components/InputError";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { useState } from "react";

const fmtLei = (v) =>
    new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v);

const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
};

export default function Index({ reports }) {
    const { data, setData, post, progress, processing, errors, reset } =
        useForm({ je_file: null });
    const [deleting, setDeleting] = useState(null);

    const submit = (e) => {
        e.preventDefault();
        post(route("dashboard.je-reports.store"), {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    const handleDelete = (report) => {
        if (
            window.confirm(
                `Ștergi raportul „${report.original_filename}” (${report.receipts_count} bonuri)?`
            )
        ) {
            router.delete(route("dashboard.je-reports.destroy", report.id), {
                onBefore: () => setDeleting(report.id),
                onFinish: () => setDeleting(null),
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Rapoarte jurnal electronic (AMEF)
                </h2>
            }
        >
            <Head title="Rapoarte JE" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h3 className="mb-2 text-lg font-bold">
                                Încarcă un jurnal electronic (.je)
                            </h3>
                            <p className="mb-4 text-sm text-gray-500">
                                Exportă jurnalul electronic de pe casa de marcat
                                (fișierul .je de pe stick) și încarcă-l aici.
                                Fișierul este verificat integral la import: suma
                                articolelor și a plăților pe fiecare bon și
                                totalurile fiecărei zile fiscale (rapoartele Z)
                                trebuie să corespundă exact.
                            </p>
                            <form
                                onSubmit={submit}
                                className="flex flex-wrap items-center gap-4"
                            >
                                <input
                                    type="file"
                                    accept=".je"
                                    onChange={(e) =>
                                        setData("je_file", e.target.files[0])
                                    }
                                    className="text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700"
                                />
                                <PrimaryButton
                                    disabled={processing || !data.je_file}
                                >
                                    {processing
                                        ? "Se importă…"
                                        : "Importă jurnalul"}
                                </PrimaryButton>
                                {progress && (
                                    <span className="text-sm text-gray-500">
                                        {progress.percentage}%
                                    </span>
                                )}
                            </form>
                            <InputError
                                message={errors.je_file}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h3 className="mb-4 text-lg font-bold">
                                Rapoarte importate
                            </h3>
                            {reports.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full table-auto text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-2 text-left">
                                                    Fișier
                                                </th>
                                                <th className="px-4 py-2 text-left">
                                                    Serie fiscală
                                                </th>
                                                <th className="px-4 py-2 text-left">
                                                    Perioadă
                                                </th>
                                                <th className="px-4 py-2 text-right">
                                                    Bonuri
                                                </th>
                                                <th className="px-4 py-2 text-right">
                                                    Total (lei)
                                                </th>
                                                <th className="px-4 py-2 text-left">
                                                    Încărcat
                                                </th>
                                                <th className="px-4 py-2 text-center">
                                                    Acțiuni
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reports.map((report) => (
                                                <tr
                                                    key={report.id}
                                                    className="border-b hover:bg-gray-50"
                                                >
                                                    <td className="border px-4 py-2">
                                                        <Link
                                                            href={route(
                                                                "dashboard.je-reports.show",
                                                                report.id
                                                            )}
                                                            className="font-semibold text-blue-700 hover:underline"
                                                        >
                                                            {
                                                                report.original_filename
                                                            }
                                                        </Link>
                                                    </td>
                                                    <td className="border px-4 py-2">
                                                        {report.fiscal_serial ??
                                                            "—"}
                                                    </td>
                                                    <td className="border px-4 py-2 whitespace-nowrap">
                                                        {fmtDate(
                                                            report.period_from
                                                        )}{" "}
                                                        –{" "}
                                                        {fmtDate(
                                                            report.period_to
                                                        )}
                                                    </td>
                                                    <td className="border px-4 py-2 text-right">
                                                        {report.receipts_count}
                                                    </td>
                                                    <td className="border px-4 py-2 text-right">
                                                        {fmtLei(report.total)}
                                                    </td>
                                                    <td className="border px-4 py-2 whitespace-nowrap">
                                                        {report.created_at}
                                                        {report.uploaded_by
                                                            ? ` · ${report.uploaded_by}`
                                                            : ""}
                                                    </td>
                                                    <td className="border px-4 py-2 text-center whitespace-nowrap">
                                                        <Link
                                                            href={route(
                                                                "dashboard.je-reports.show",
                                                                report.id
                                                            )}
                                                            className="mr-3 text-blue-700 hover:underline"
                                                        >
                                                            Vezi
                                                        </Link>
                                                        <a
                                                            href={route(
                                                                "dashboard.je-reports.export",
                                                                report.id
                                                            )}
                                                            className="mr-3 text-green-700 hover:underline"
                                                        >
                                                            Excel
                                                        </a>
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    report
                                                                )
                                                            }
                                                            disabled={
                                                                deleting ===
                                                                report.id
                                                            }
                                                            className="font-bold text-red-600 hover:text-red-800 disabled:opacity-50"
                                                        >
                                                            {deleting ===
                                                            report.id
                                                                ? "…"
                                                                : "X"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500">
                                    Niciun jurnal importat încă.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
