import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const CHART = { series: "#2a78d6", grid: "#e5e7eb", ink: "#52514e" };
const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const fmtLei = (v) =>
    new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v ?? 0);

const fmtDate = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
};

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

const axisProps = {
    tick: { fontSize: 11, fill: CHART.ink },
    tickLine: false,
};

export default function Month({
    report,
    month,
    month_label: monthLabel,
    daily,
    hourly,
    weekdays,
    products,
    methods,
    prev,
    insights,
}) {
    const dailyChart = daily.map((d) => ({
        ...d,
        label: d.receipt_date.slice(8, 10),
    }));
    const hourlyChart = hourly.map((h) => ({
        ...h,
        label: String(h.hour).padStart(2, "0"),
    }));

    const methodsChart = (() => {
        const top = methods.slice(0, 6);
        const rest = methods.slice(6);
        const rows = top.map((m) => ({ name: m.pay_method, total: m.total }));
        if (rest.length > 0) {
            rows.push({
                name: "Altele",
                total:
                    Math.round(
                        rest.reduce((s, m) => s + m.total, 0) * 100
                    ) / 100,
            });
        }
        return rows;
    })();

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {monthLabel} — raport JE {report.fiscal_serial}
                    </h2>
                    <div className="flex gap-3">
                        <Link
                            href={`${route(
                                "dashboard.je-reports.show",
                                report.id
                            )}?luna=${month}`}
                            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                        >
                            Vezi bonurile lunii
                        </Link>
                        <Link
                            href={route("dashboard.je-reports.show", report.id)}
                            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                        >
                            Înapoi la raport
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={`${monthLabel} — raport JE`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <Section title="Concluzii">
                        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                            {insights.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                        {prev && (
                            <p className="mt-3 text-xs text-gray-400">
                                Comparația se face cu {prev.label}: {prev.n}{" "}
                                bonuri, {fmtLei(prev.total)} lei.
                            </p>
                        )}
                    </Section>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section title="Vânzări pe zile (lei)">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={dailyChart}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        stroke={CHART.grid}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        {...axisProps}
                                        axisLine={{ stroke: CHART.grid }}
                                        interval={1}
                                    />
                                    <YAxis
                                        {...axisProps}
                                        axisLine={false}
                                        width={48}
                                        tickFormatter={(v) =>
                                            v >= 1000
                                                ? `${Math.round(v / 1000)}k`
                                                : v
                                        }
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v, name, p) => [
                                            `${fmtLei(v)} lei (${p.payload.n} bonuri)`,
                                            "Vânzări",
                                        ]}
                                        labelFormatter={(l, p) =>
                                            p?.[0]
                                                ? fmtDate(
                                                      p[0].payload.receipt_date
                                                  )
                                                : l
                                        }
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="total"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={20}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Medie pe ore (lei / zi cu vânzări)">
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
                                        {...axisProps}
                                        axisLine={false}
                                        width={44}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v, name, p) => [
                                            `${fmtLei(v)} lei (${p.payload.n} bonuri în total)`,
                                            "Medie / zi",
                                        ]}
                                        labelFormatter={(l) => `Ora ${l}:00`}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="avg"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={18}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Media pe zilele săptămânii (lei / zi)">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart
                                    data={weekdays}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        stroke={CHART.grid}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="weekday"
                                        {...axisProps}
                                        axisLine={{ stroke: CHART.grid }}
                                    />
                                    <YAxis
                                        {...axisProps}
                                        axisLine={false}
                                        width={48}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v, name, p) => [
                                            `${fmtLei(v)} lei/zi (${p.payload.days} zile, total ${fmtLei(p.payload.total)} lei)`,
                                            "Medie",
                                        ]}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="avg"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={36}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Pe metode de plată (lei)">
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
                                        {...axisProps}
                                        axisLine={false}
                                        width={110}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [
                                            `${fmtLei(v)} lei`,
                                            "Total",
                                        ]}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
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
                                            style={{
                                                fontSize: 11,
                                                fill: CHART.ink,
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>
                    </div>

                    <Section title="Produse vândute în această lună">
                        <div className="max-h-[28rem] overflow-auto">
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
            </div>
        </AuthenticatedLayout>
    );
}
