import { useMemo, useState } from "react";

/**
 * Caret that sits next to a sortable column header: faint + pointing up when
 * the column isn't the active sort, solid and flipped to match direction
 * when it is — the same affordance used by statistics-portal data tables
 * (INSSE/Eurostat-style), so the sortable state is visible without a caption.
 */
function SortCaret({ active, direction }) {
    return (
        <svg
            width="9"
            height="9"
            viewBox="0 0 10 10"
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-150 ${
                active ? "text-gray-700" : "text-gray-300"
            }`}
            style={{
                transform: active && direction === "desc" ? "rotate(180deg)" : undefined,
            }}
        >
            <path d="M5 1.5 L9 7.5 L1 7.5 Z" fill="currentColor" />
        </svg>
    );
}

function compareRows(a, b, valueOf, dir) {
    const va = valueOf(a);
    const vb = valueOf(b);
    const aEmpty = va === null || va === undefined || va === "";
    const bEmpty = vb === null || vb === undefined || vb === "";
    // rows without a value for this column always sort last, in both directions
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    const cmp =
        typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), "ro", {
                  numeric: true,
                  sensitivity: "base",
              });

    return dir === "asc" ? cmp : -cmp;
}

/**
 * A data table with click-to-sort column headers.
 *
 * columns: [{
 *   key,                 // unique id; also the default value lookup (row[key])
 *   label,                // header text
 *   align: 'left'|'right' // also picks the default first-click direction:
 *                          // numbers start descending (biggest first), text/dates start ascending
 *   value?: (row) => primitive   // sort key, defaults to row[key]
 *   render?: (row) => node       // cell content, defaults to String(row[key])
 *   sortable?: false             // opt out (e.g. free-text "notes" columns)
 * }]
 */
export default function SortableTable({
    columns,
    rows,
    getRowKey,
    initialSort = null,
    stickyHeader = false,
    maxHeight = null,
}) {
    const [sort, setSort] = useState(initialSort);

    const sorted = useMemo(() => {
        if (!sort) return rows;
        const col = columns.find((c) => c.key === sort.key);
        if (!col) return rows;
        const valueOf = col.value ?? ((r) => r[col.key]);

        return [...rows].sort((a, b) => compareRows(a, b, valueOf, sort.dir));
    }, [rows, sort, columns]);

    const toggleSort = (col) => {
        if (col.sortable === false) return;
        setSort((prev) => {
            if (!prev || prev.key !== col.key) {
                return { key: col.key, dir: col.align === "right" ? "desc" : "asc" };
            }
            return { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" };
        });
    };

    const table = (
        <table className="min-w-full table-auto text-sm">
            <thead className={`bg-gray-100 ${stickyHeader ? "sticky top-0" : ""}`}>
                <tr>
                    {columns.map((col) => {
                        const active = sort?.key === col.key;
                        const sortable = col.sortable !== false;
                        return (
                            <th
                                key={col.key}
                                scope="col"
                                aria-sort={
                                    active
                                        ? sort.dir === "asc"
                                            ? "ascending"
                                            : "descending"
                                        : "none"
                                }
                                className={`whitespace-nowrap px-3 py-2 font-semibold ${
                                    col.align === "right" ? "text-right" : "text-left"
                                } ${sortable ? "cursor-pointer select-none hover:bg-gray-200" : ""}`}
                                onClick={() => toggleSort(col)}
                            >
                                <span
                                    className={`inline-flex items-center gap-1 ${
                                        col.align === "right" ? "flex-row-reverse" : ""
                                    }`}
                                >
                                    {col.label}
                                    {sortable && (
                                        <SortCaret
                                            active={active}
                                            direction={active ? sort.dir : null}
                                        />
                                    )}
                                </span>
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {sorted.map((row) => (
                    <tr key={getRowKey(row)} className="border-b hover:bg-gray-50">
                        {columns.map((col) => (
                            <td
                                key={col.key}
                                className={`px-3 py-2 ${
                                    col.align === "right" ? "text-right" : "text-left"
                                }`}
                            >
                                {col.render ? col.render(row) : (row[col.key] ?? "—")}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );

    if (!maxHeight) return table;

    return (
        <div className="overflow-auto" style={{ maxHeight }}>
            {table}
        </div>
    );
}
