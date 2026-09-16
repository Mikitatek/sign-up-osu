import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import SortableTable from "@/Components/SortableTable";
import { Head, Link } from "@inertiajs/react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
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

const MONTHS_RO = [
    "Ian",
    "Feb",
    "Mar",
    "Apr",
    "Mai",
    "Iun",
    "Iul",
    "Aug",
    "Sep",
    "Oct",
    "Noi",
    "Dec",
];

const fmtLei = (v) =>
    new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v ?? 0);

const fmtDate = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
};

const shortMonth = (ym) =>
    `${MONTHS_RO[parseInt(ym.slice(5, 7), 10) - 1]} ${ym.slice(2, 4)}`;

function Card({ label, value, sub }) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-md">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            {sub && <div className="text-xs text-gray-400">{sub}</div>}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
            <div className="p-6 text-gray-900">
                <h3 className="mb-4 text-lg font-bold">{title}</h3>
                {children}
            </div>
        </div>
    );
}

const axisProps = {
    tick: { fontSize: 11, fill: CHART.ink },
    tickLine: false,
};

export default function Product({
    report,
    name,
    monthly,
    hourly,
    weekdays,
    prices,
    summary,
    insights,
}) {
    const monthlyChart = monthly.map((m) => ({
        ...m,
        label: shortMonth(m.month),
    }));
    const hourlyChart = hourly.map((h) => ({
        ...h,
        label: String(h.hour).padStart(2, "0"),
    }));
    // prețul curent = nivelul folosit cel mai recent (la egalitate, cel mai vândut)
    const currentPrice =
        prices.length > 0
            ? [...prices].sort(
                  (a, b) =>
                      b.last_seen.localeCompare(a.last_seen) || b.qty - a.qty
              )[0].price
            : null;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {name} — raport JE {report.fiscal_serial}
                    </h2>
                    <Link
                        href={route("dashboard.je-reports.show", report.id)}
                        className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                    >
                        Înapoi la raport
                    </Link>
                </div>
            }
        >
            <Head title={`${name} — analiză produs`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Card
                            label="Cantitate vândută"
                            value={`${summary.qty} buc.`}
                        />
                        <Card
                            label="Valoare totală"
                            value={`${fmtLei(summary.value)} lei`}
                        />
                        <Card
                            label="Pondere în vânzări"
                            value={
                                summary.share !== null
                                    ? `${summary.share}%`
                                    : "—"
                            }
                        />
                        <Card
                            label="Preț curent"
                            value={
                                currentPrice !== null
                                    ? `${fmtLei(currentPrice)} lei`
                                    : "—"
                            }
                            sub={
                                prices.length > 1
                                    ? `${prices.length} praguri de preț în istoric`
                                    : null
                            }
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
                        <Section title="Valoare pe luni (lei)">
                            <ResponsiveContainer width="100%" height={240}>
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
                                        {...axisProps}
                                        axisLine={{ stroke: CHART.grid }}
                                        interval="preserveStartEnd"
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
                                        formatter={(v, n, p) => [
                                            `${fmtLei(v)} lei (${p.payload.qty} buc.)`,
                                            "Valoare",
                                        ]}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={24}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Cantitate pe luni (buc.)">
                            <ResponsiveContainer width="100%" height={240}>
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
                                        {...axisProps}
                                        axisLine={{ stroke: CHART.grid }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        {...axisProps}
                                        axisLine={false}
                                        width={44}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [`${v} buc.`, "Cantitate"]}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="qty"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={24}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Preț mediu pe luni (lei)">
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart
                                    data={monthlyChart}
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
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        {...axisProps}
                                        axisLine={false}
                                        width={44}
                                        domain={["auto", "auto"]}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [
                                            `${fmtLei(v)} lei`,
                                            "Preț mediu",
                                        ]}
                                    />
                                    <Line
                                        type="stepAfter"
                                        dataKey="avg_price"
                                        stroke={CHART.series}
                                        strokeWidth={2}
                                        dot={{ r: 2 }}
                                        activeDot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Profil orar (buc. vândute)">
                            <ResponsiveContainer width="100%" height={220}>
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
                                        formatter={(v) => [`${v} buc.`, "Cantitate"]}
                                        labelFormatter={(l) => `Ora ${l}:00`}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="qty"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={18}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section title="Pe zilele săptămânii (buc.)">
                            <ResponsiveContainer width="100%" height={220}>
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
                                        width={44}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(v) => [`${v} buc.`, "Cantitate"]}
                                        cursor={{
                                            fill: "rgba(42,120,214,0.08)",
                                        }}
                                    />
                                    <Bar
                                        dataKey="qty"
                                        fill={CHART.series}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={36}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Istoric de preț">
                            <SortableTable
                                columns={[
                                    {
                                        key: "price",
                                        label: "Preț (lei)",
                                        align: "right",
                                        render: (p) => (
                                            <span className="font-semibold">
                                                {fmtLei(p.price)}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "first_seen",
                                        label: "Prima zi",
                                        align: "left",
                                        render: (p) => fmtDate(p.first_seen),
                                    },
                                    {
                                        key: "last_seen",
                                        label: "Ultima zi",
                                        align: "left",
                                        render: (p) => fmtDate(p.last_seen),
                                    },
                                    { key: "qty", label: "Buc. vândute", align: "right" },
                                ]}
                                rows={prices}
                                getRowKey={(p) => `${p.price}-${p.first_seen}`}
                                initialSort={{ key: "first_seen", dir: "asc" }}
                            />
                        </Section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
