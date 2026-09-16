import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import SortableTable from "@/Components/SortableTable";
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

const fmtPct = (v) =>
    new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(v);

function ComparisonCard({ label, current, compare }) {
    if (!compare || compare.total <= 0) {
        return (
            <div className="rounded-lg bg-white p-4 shadow-md">
                <div className="text-sm text-gray-500">{label}</div>
                <div className="mt-1 text-sm text-gray-400">
                    Fără date de comparat.
                </div>
            </div>
        );
    }
    const delta = ((current - compare.total) / compare.total) * 100;
    const up = delta >= 0;
    return (
        <div className="rounded-lg bg-white p-4 shadow-md">
            <div className="text-sm text-gray-500">{label}</div>
            <div
                className={`text-2xl font-bold ${
                    up ? "text-emerald-600" : "text-red-600"
                }`}
            >
                {up ? "▲" : "▼"} {fmtPct(Math.abs(delta))}%
            </div>
            <div className="text-xs text-gray-400">
                {compare.label}: {fmtLei(compare.total)} lei, {compare.n} bonuri
            </div>
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
    prev_year: prevYear,
    insights,
}) {
    const total = daily.reduce((s, d) => s + d.total, 0);

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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <ComparisonCard
                            label="Față de luna anterioară"
                            current={total}
                            compare={prev}
                        />
                        <ComparisonCard
                            label="Față de aceeași lună, anul trecut"
                            current={total}
                            compare={prevYear}
                        />
                    </div>

                    <Section title="Concluzii">
                        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                            {insights.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
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
                        <SortableTable
                            columns={[
                                {
                                    key: "name",
                                    label: "Produs",
                                    align: "left",
                                    render: (p) => (
                                        <Link
                                            href={`${route(
                                                "dashboard.je-reports.product",
                                                report.id
                                            )}?nume=${encodeURIComponent(p.name)}`}
                                            className="font-medium text-blue-700 hover:underline"
                                        >
                                            {p.name}
                                        </Link>
                                    ),
                                },
                                { key: "qty", label: "Cantitate", align: "right" },
                                {
                                    key: "value",
                                    label: "Valoare (lei)",
                                    align: "right",
                                    render: (p) => (
                                        <span className="font-semibold">
                                            {fmtLei(p.value)}
                                        </span>
                                    ),
                                },
                            ]}
                            rows={products}
                            getRowKey={(p) => p.name}
                            initialSort={{ key: "value", dir: "desc" }}
                            stickyHeader
                            maxHeight="28rem"
                        />
                    </Section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
