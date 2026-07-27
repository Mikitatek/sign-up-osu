import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// single-series charts: one validated hue + neutral ink (dataviz palette)
const CHART = {
    series: "#2a78d6",
    grid: "#e5e7eb",
    ink: "#52514e",
};

const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const METHOD_COLUMNS = [
    ["numerar", "Numerar"],
    ["card", "Card"],
    ["online", "Online"],
    ["tichete_masa", "Tichete masă"],
    ["tichete_valorice", "Tichete valorice"],
    ["voucher", "Voucher"],
    ["plata_moderna", "Plată modernă"],
    ["credit", "Credit"],
    ["numerar_eur_lei", "Numerar EUR (echiv. lei)"],
];

const MONTH_NAMES = {
    "01": "Ianuarie",
    "02": "Februarie",
    "03": "Martie",
    "04": "Aprilie",
    "05": "Mai",
    "06": "Iunie",
    "07": "Iulie",
    "08": "August",
    "09": "Septembrie",
    10: "Octombrie",
    11: "Noiembrie",
    12: "Decembrie",
};

const fmtLei = (v) =>
    new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v ?? 0);

const fmtLeiDash = (v) => (v ? fmtLei(v) : "–");

const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
};

const monthLabel = (ym) => `${MONTH_NAMES[ym.slice(5, 7)]} ${ym.slice(0, 4)}`;

function Card({ label, value, sub }) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-md">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            {sub && <div className="text-xs text-gray-400">{sub}</div>}
        </div>
    );
}

function Section({ title, children, right }) {
    return (
        <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
            <div className="p-6 text-gray-900">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">{title}</h3>
                    {right}
                </div>
                {children}
            </div>
        </div>
    );
}

function MethodTable({ rows, firstColumn, firstLabel, firstFormat, firstLink }) {
    return (
        <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full table-auto text-sm">
                <thead className="sticky top-0 bg-gray-100">
                    <tr>
                        <th className="px-3 py-2 text-left">{firstLabel}</th>
                        <th className="px-3 py-2 text-right">Nr. bonuri</th>
                        <th className="px-3 py-2 text-right">Total (lei)</th>
                        {METHOD_COLUMNS.map(([key, label]) => (
                            <th key={key} className="px-3 py-2 text-right">
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row[firstColumn]}
                            className="border-b hover:bg-gray-50"
                        >
                            <td className="whitespace-nowrap px-3 py-2">
                                {firstLink ? (
                                    <Link
                                        href={firstLink(row)}
                                        className="font-medium text-blue-700 hover:underline"
                                    >
                                        {firstFormat(row[firstColumn])}
                                    </Link>
                                ) : (
                                    firstFormat(row[firstColumn])
                                )}
                            </td>
                            <td className="px-3 py-2 text-right">{row.n}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                                {fmtLei(row.total)}
                            </td>
                            {METHOD_COLUMNS.map(([key]) => (
                                <td
                                    key={key}
                                    className="px-3 py-2 text-right text-gray-600"
                                >
                                    {fmtLeiDash(row[key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Show({
    report,
    monthly,
    daily,
    methods,
    hourly,
    active_days: activeDays,
    products,
    receipts,
    filters,
}) {
    const [showDaily, setShowDaily] = useState(false);

    const monthlyChart = monthly.map((m) => ({
        ...m,
        label: `${MONTH_NAMES[m.month.slice(5, 7)].slice(0, 3)} ${m.month.slice(2, 4)}`,
    }));

    const hourlyChart = hourly.map((h) => ({
        ...h,
        label: `${String(h.hour).padStart(2, "0")}`,
    }));

    // part-to-whole cu >7 clase: păstrăm top 6 și strângem restul în „Altele”
    const methodsChart = (() => {
        const top = methods.slice(0, 6);
        const rest = methods.slice(6);
        const rows = top.map((m) => ({
            name: m.pay_method,
            total: m.total,
        }));
        if (rest.length > 0) {
            rows.push({
                name: "Altele",
                total: Math.round(rest.reduce((s, m) => s + m.total, 0) * 100) / 100,
            });
        }
        return rows;
    })();

    const dailyChart = daily.map((d) => ({
        date: d.receipt_date,
        label: fmtDate(d.receipt_date),
        total: d.total,
    }));

    const applyFilter = (patch) => {
        const params = { ...filters, ...patch };
        Object.keys(params).forEach(
            (k) => params[k] || delete params[k]
        );
        router.get(route("dashboard.je-reports.show", report.id), params, {
            preserveScroll: true,
            preserveState: true,
            only: ["receipts", "filters"],
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Raport JE — {report.original_filename}
                    </h2>
                    <div className="flex gap-3">
                        <a
                            href={route(
                                "dashboard.je-reports.export",
                                report.id
                            )}
                            className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                        >
                            Descarcă Excel
                        </a>
                        <Link
                            href={route("dashboard.je-reports.index")}
                            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                        >
                            Înapoi
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={`Raport JE ${report.fiscal_serial ?? ""}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Card
                            label="Perioadă"
                            value={`${fmtDate(report.period_from)} – ${fmtDate(
                                report.period_to
                            )}`}
                            sub={`Serie fiscală ${
                                report.fiscal_serial ?? "—"
                            } · S/N ${report.device_serial ?? "—"}`}
                        />
                        <Card
                            label="Total vânzări"
                            value={`${fmtLei(report.total)} lei`}
                        />
                        <Card
                            label="Bonuri fiscale"
                            value={report.receipts_count}
                        />
                        <Card
                            label="Linii de articole"
                            value={report.items_count}
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section title="Vânzări pe luni (lei)">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={monthlyChart}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        stroke={CHART.grid}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11, fill: CHART.ink }}
                                        tickLine={false}
                                        axisLine={{ stroke: CHART.grid }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: CHART.ink }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={52}
                                        tickFormatter={(v) =>
                                            v >= 1000 ? `${Math.round(v / 1000)}k` : v
                                        }
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [`${fmtLei(v)} lei`, "Vânzări"]}
                                        labelFormatter={(l, p) =>
                                            p?.[0] ? monthLabel(p[0].payload.month) : l
                                        }
                                        cursor={{ fill: "rgba(42,120,214,0.08)" }}
                                    />
                                    <Bar
                                        dataKey="total"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={28}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section
                            title={`Medie pe ore (lei / zi cu vânzări, ${activeDays} zile)`}
                        >
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={hourlyChart}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        stroke={CHART.grid}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 10, fill: CHART.ink }}
                                        tickLine={false}
                                        axisLine={{ stroke: CHART.grid }}
                                        interval={1}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: CHART.ink }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={44}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v, name, p) => [
                                            `${fmtLei(v)} lei (${p.payload.n} bonuri, total ${fmtLei(p.payload.total)} lei)`,
                                            "Medie / zi",
                                        ]}
                                        labelFormatter={(l) => `Ora ${l}:00`}
                                        cursor={{ fill: "rgba(42,120,214,0.08)" }}
                                    />
                                    <Bar
                                        dataKey="avg"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={20}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>
                    </div>

                    <Section title="Sumar lunar (click pe lună pentru detalii)">
                        <MethodTable
                            rows={monthly}
                            firstColumn="month"
                            firstLabel="Luna"
                            firstFormat={monthLabel}
                            firstLink={(row) =>
                                route("dashboard.je-reports.month", {
                                    jeReport: report.id,
                                    month: row.month,
                                })
                            }
                        />
                    </Section>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section title="Pe metode de plată">
                            <ResponsiveContainer
                                width="100%"
                                height={40 * methodsChart.length + 16}
                            >
                                <BarChart
                                    data={methodsChart}
                                    layout="vertical"
                                    margin={{ top: 0, right: 84, left: 8, bottom: 0 }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: CHART.ink }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={110}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [`${fmtLei(v)} lei`, "Total"]}
                                        cursor={{ fill: "rgba(42,120,214,0.08)" }}
                                    />
                                    <Bar
                                        dataKey="total"
                                        fill={CHART.series}
                                        radius={[0, 4, 4, 0]}
                                        maxBarSize={18}
                                    >
                                        <LabelList
                                            dataKey="total"
                                            position="right"
                                            formatter={(v) => fmtLei(v)}
                                            style={{ fontSize: 11, fill: CHART.ink }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <table className="min-w-full table-auto text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left">
                                            Metodă
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Nr. bonuri
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Total (lei)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {methods.map((m) => (
                                        <tr
                                            key={m.pay_method}
                                            className="border-b hover:bg-gray-50"
                                        >
                                            <td className="px-3 py-2">
                                                {m.pay_method}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {m.n}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold">
                                                {fmtLei(m.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Section>

                        <Section title="Sumar produse">
                            <div className="max-h-96 overflow-auto">
                                <table className="min-w-full table-auto text-sm">
                                    <thead className="sticky top-0 bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">
                                                Produs
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                Cantitate
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                Valoare (lei)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p) => (
                                            <tr
                                                key={p.name}
                                                className="border-b hover:bg-gray-50"
                                            >
                                                <td className="px-3 py-2">
                                                    <Link
                                                        href={`${route(
                                                            "dashboard.je-reports.product",
                                                            report.id
                                                        )}?nume=${encodeURIComponent(p.name)}`}
                                                        className="font-medium text-blue-700 hover:underline"
                                                    >
                                                        {p.name}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {p.qty}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold">
                                                    {fmtLei(p.value)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    </div>

                    <Section
                        title={`Vânzări pe zile (${daily.length} zile cu vânzări)`}
                        right={
                            <button
                                onClick={() => setShowDaily(!showDaily)}
                                className="text-sm font-semibold text-blue-700 hover:underline"
                            >
                                {showDaily ? "Ascunde tabelul" : "Arată tabelul"}
                            </button>
                        }
                    >
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart
                                data={dailyChart}
                                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                            >
                                <CartesianGrid
                                    stroke={CHART.grid}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: CHART.ink }}
                                    tickLine={false}
                                    axisLine={{ stroke: CHART.grid }}
                                    minTickGap={48}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: CHART.ink }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={52}
                                    tickFormatter={(v) =>
                                        v >= 1000 ? `${Math.round(v / 1000)}k` : v
                                    }
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(v) => [`${fmtLei(v)} lei`, "Vânzări"]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke={CHART.series}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        {showDaily && (
                            <div className="mt-4">
                                <MethodTable
                                    rows={daily}
                                    firstColumn="receipt_date"
                                    firstLabel="Data"
                                    firstFormat={fmtDate}
                                />
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Bonuri fiscale"
                        right={
                            <div className="flex gap-2 text-sm">
                                <select
                                    value={filters.luna ?? ""}
                                    onChange={(e) =>
                                        applyFilter({ luna: e.target.value })
                                    }
                                    className="rounded-md border-gray-300 text-sm"
                                >
                                    <option value="">Toate lunile</option>
                                    {monthly.map((m) => (
                                        <option key={m.month} value={m.month}>
                                            {monthLabel(m.month)}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={filters.metoda ?? ""}
                                    onChange={(e) =>
                                        applyFilter({ metoda: e.target.value })
                                    }
                                    className="rounded-md border-gray-300 text-sm"
                                >
                                    <option value="">Toate metodele</option>
                                    {methods.map((m) => (
                                        <option
                                            key={m.pay_method}
                                            value={m.pay_method}
                                        >
                                            {m.pay_method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        }
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left">
                                            Data
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            Ora
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Z
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            BF
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            Total (lei)
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            Metodă de plată
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            CIF client
                                        </th>
                                        <th className="px-3 py-2 text-left">
                                            Observații
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.data.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="border-b hover:bg-gray-50"
                                        >
                                            <td className="whitespace-nowrap px-3 py-2">
                                                {fmtDate(
                                                    r.receipt_date.slice(0, 10)
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {r.receipt_time}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {r.z}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {r.bf}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold">
                                                {fmtLei(r.total)}
                                            </td>
                                            <td className="px-3 py-2">
                                                {r.pay_method}
                                            </td>
                                            <td className="px-3 py-2">
                                                {r.cif_client ?? ""}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-gray-500">
                                                {[
                                                    r.numerar_eur_orig
                                                        ? `plătit ${r.numerar_eur_orig} EUR`
                                                        : null,
                                                    r.anulare_lines > 0
                                                        ? `${r.anulare_lines} linie(i) anulată(e)`
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join("; ")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-1">
                            {receipts.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url}
                                    onClick={() =>
                                        router.visit(link.url, {
                                            preserveScroll: true,
                                            preserveState: true,
                                            only: ["receipts", "filters"],
                                        })
                                    }
                                    className={`rounded px-3 py-1 text-sm ${
                                        link.active
                                            ? "bg-gray-800 text-white"
                                            : link.url
                                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                              : "text-gray-400"
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    </Section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
