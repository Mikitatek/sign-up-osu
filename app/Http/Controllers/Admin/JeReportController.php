<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JeReport;
use App\Services\JeReportImporter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JeReportController extends Controller
{
    private const METHOD_COLUMNS = [
        'numerar', 'card', 'online', 'tichete_masa', 'tichete_valorice',
        'voucher', 'plata_moderna', 'credit', 'numerar_eur_lei',
    ];

    private const METHOD_HEADERS = [
        'Numerar', 'Card', 'Online', 'Tichete masă', 'Tichete valorice',
        'Voucher', 'Plată modernă', 'Credit', 'Numerar EUR (echiv. lei)',
    ];

    public function index()
    {
        $reports = JeReport::with('uploader:id,name')
            ->latest()
            ->get()
            ->map(fn (JeReport $r) => [
                'id' => $r->id,
                'original_filename' => $r->original_filename,
                'fiscal_serial' => $r->fiscal_serial,
                'period_from' => $r->period_from?->format('Y-m-d'),
                'period_to' => $r->period_to?->format('Y-m-d'),
                'receipts_count' => $r->receipts_count,
                'total' => $r->total,
                'uploaded_by' => $r->uploader?->name,
                'created_at' => $r->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('Dashboard/JeReports/Index', ['reports' => $reports]);
    }

    public function store(Request $request, JeReportImporter $importer)
    {
        // 30 MB covers ~3 years of journal for this register; parsing keeps
        // the whole line array in memory, so the cap also bounds peak RAM
        $request->validate(
            ['je_file' => ['required', 'file', 'max:30720']],
            [],
            ['je_file' => 'fișier jurnal']
        );

        $file = $request->file('je_file');
        if (strtolower($file->getClientOriginalExtension()) !== 'je') {
            throw ValidationException::withMessages([
                'je_file' => 'Fișierul trebuie să fie un jurnal electronic exportat de casa de marcat (extensia .je).',
            ]);
        }

        $contents = file_get_contents($file->getRealPath());
        $header = mb_convert_encoding(substr($contents, 0, 4000), 'UTF-8', 'ISO-8859-2');
        if (! str_contains($header, 'JURNAL ELECTRONIC')) {
            throw ValidationException::withMessages([
                'je_file' => 'Fișierul nu arată ca un jurnal electronic AMEF (lipsește antetul „JURNAL ELECTRONIC”).',
            ]);
        }

        $result = $importer->import($contents, $file->getClientOriginalName(), $request->user());

        if ($result['report'] === null) {
            $shown = array_slice($result['problems'], 0, 5);
            $extra = count($result['problems']) - count($shown);
            throw ValidationException::withMessages([
                'je_file' => 'Jurnalul nu a trecut de verificările de integritate: '
                    .implode(' | ', $shown)
                    .($extra > 0 ? " (și încă {$extra} probleme)" : ''),
            ]);
        }

        return redirect()
            ->route('dashboard.je-reports.show', $result['report'])
            ->with('success', 'Jurnalul a fost importat și verificat.');
    }

    public function show(Request $request, JeReport $jeReport)
    {
        $daily = $jeReport->receipts()
            ->selectRaw('receipt_date, COUNT(*) as n, SUM(total) as total, '
                .implode(', ', array_map(fn ($c) => "SUM({$c}) as {$c}", self::METHOD_COLUMNS)))
            ->groupBy('receipt_date')
            ->orderBy('receipt_date')
            ->get()
            ->map(fn ($row) => $this->numericRow($row, ['receipt_date' => substr((string) $row->receipt_date, 0, 10)]));

        $monthly = collect($daily)
            ->groupBy(fn ($d) => substr($d['receipt_date'], 0, 7))
            ->map(function ($days, $ym) {
                $out = ['month' => $ym, 'n' => $days->sum('n'), 'total' => round($days->sum('total'), 2)];
                foreach (self::METHOD_COLUMNS as $c) {
                    $out[$c] = round($days->sum($c), 2);
                }

                return $out;
            })
            ->values();

        $methods = $jeReport->receipts()
            ->selectRaw('pay_method, COUNT(*) as n, SUM(total) as total')
            ->groupBy('pay_method')
            ->orderByRaw('SUM(total) DESC')
            ->get()
            ->map(fn ($row) => $this->numericRow($row));

        $hourly = $this->hourlyAverages($jeReport, max(1, count($daily)));

        $products = $jeReport->items()
            ->selectRaw('name, SUM(qty) as qty, SUM(value) as value')
            ->groupBy('name')
            ->orderByRaw('SUM(value) DESC')
            ->get()
            ->map(fn ($row) => $this->numericRow($row));

        $receiptsQuery = $jeReport->receipts()
            ->orderBy('receipt_date')
            ->orderBy('receipt_time');
        if (($month = $request->query('luna')) && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $receiptsQuery
                ->whereDate('receipt_date', '>=', "{$month}-01")
                ->whereDate('receipt_date', '<', date('Y-m-d', strtotime("{$month}-01 +1 month")));
        }
        if ($method = $request->query('metoda')) {
            $receiptsQuery->where('pay_method', $method);
        }

        return Inertia::render('Dashboard/JeReports/Show', [
            'report' => [
                'id' => $jeReport->id,
                'original_filename' => $jeReport->original_filename,
                'device_serial' => $jeReport->device_serial,
                'fiscal_serial' => $jeReport->fiscal_serial,
                'period_from' => $jeReport->period_from?->format('Y-m-d'),
                'period_to' => $jeReport->period_to?->format('Y-m-d'),
                'receipts_count' => $jeReport->receipts_count,
                'items_count' => $jeReport->items_count,
                'total' => $jeReport->total,
            ],
            'monthly' => $monthly,
            'daily' => $daily,
            'methods' => $methods,
            'hourly' => $hourly,
            'active_days' => count($daily),
            'products' => $products,
            'receipts' => $receiptsQuery->paginate(100)->withQueryString(),
            'filters' => [
                'luna' => $month,
                'metoda' => $method,
            ],
        ]);
    }

    private const RO_MONTHS = [
        1 => 'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
        'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ];

    private const RO_WEEKDAYS = [
        1 => 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică',
    ];

    /** Detaliu pe o lună: profil zilnic/orar, produse, comparație cu luna anterioară. */
    public function monthShow(Request $request, JeReport $jeReport, string $month)
    {
        abort_unless(preg_match('/^\d{4}-\d{2}$/', $month), 404);
        [$from, $to] = $this->monthRange($month);

        $daily = $jeReport->receipts()
            ->selectRaw('receipt_date, COUNT(*) as n, SUM(total) as total, '
                .implode(', ', array_map(fn ($c) => "SUM({$c}) as {$c}", self::METHOD_COLUMNS)))
            ->whereBetween('receipt_date', [$from, $to])
            ->groupBy('receipt_date')
            ->orderBy('receipt_date')
            ->get()
            ->map(fn ($row) => $this->numericRow($row, ['receipt_date' => substr((string) $row->receipt_date, 0, 10)]));
        abort_if(count($daily) === 0, 404);

        $hourly = $this->hourlyAverages($jeReport, max(1, count($daily)), $from, $to);

        $weekdays = collect($daily)
            ->groupBy(fn ($d) => (int) date('N', strtotime($d['receipt_date'])))
            ->map(fn ($days, $dow) => [
                'weekday' => self::RO_WEEKDAYS[$dow],
                'dow' => $dow,
                'days' => $days->count(),
                'avg' => round($days->sum('total') / $days->count(), 2),
                'total' => round($days->sum('total'), 2),
            ])
            ->sortBy('dow')
            ->values();

        $products = $jeReport->items()
            ->join('je_receipts', 'je_items.je_receipt_id', '=', 'je_receipts.id')
            ->whereBetween('je_receipts.receipt_date', [$from, $to])
            ->selectRaw('je_items.name, SUM(je_items.qty) as qty, SUM(je_items.value) as value')
            ->groupBy('je_items.name')
            ->orderByRaw('SUM(je_items.value) DESC')
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'qty' => (int) $row->qty, 'value' => round((float) $row->value, 2)]);

        $methods = $jeReport->receipts()
            ->selectRaw('pay_method, COUNT(*) as n, SUM(total) as total')
            ->whereBetween('receipt_date', [$from, $to])
            ->groupBy('pay_method')
            ->orderByRaw('SUM(total) DESC')
            ->get()
            ->map(fn ($row) => $this->numericRow($row));

        $prevMonth = date('Y-m', strtotime("{$from} -1 month"));
        [$pFrom, $pTo] = $this->monthRange($prevMonth);
        $prev = $jeReport->receipts()
            ->selectRaw('COUNT(*) as n, SUM(total) as total')
            ->whereBetween('receipt_date', [$pFrom, $pTo])
            ->first();
        $prevData = ((int) $prev->n) > 0
            ? ['month' => $prevMonth, 'label' => $this->monthLabel($prevMonth), 'n' => (int) $prev->n, 'total' => round((float) $prev->total, 2)]
            : null;

        return Inertia::render('Dashboard/JeReports/Month', [
            'report' => ['id' => $jeReport->id, 'fiscal_serial' => $jeReport->fiscal_serial],
            'month' => $month,
            'month_label' => $this->monthLabel($month),
            'daily' => $daily,
            'hourly' => $hourly,
            'weekdays' => $weekdays,
            'products' => $products,
            'methods' => $methods,
            'prev' => $prevData,
            'insights' => $this->monthInsights($daily, $hourly, $weekdays, $products, $methods, $prevData),
        ]);
    }

    /** Detaliu pe un produs: evoluție lunară, profil orar, preț mediu, concluzii. */
    public function productShow(Request $request, JeReport $jeReport)
    {
        $name = (string) $request->query('nume');
        abort_if($name === '' || mb_strlen($name) > 255, 404);

        $base = $jeReport->items()
            ->join('je_receipts', 'je_items.je_receipt_id', '=', 'je_receipts.id')
            ->where('je_items.name', $name);

        $monthly = (clone $base)
            ->selectRaw('SUBSTR(je_receipts.receipt_date, 1, 7) as ym, SUM(je_items.qty) as qty, SUM(je_items.value) as value')
            ->groupBy('ym')
            ->orderBy('ym')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->ym,
                'qty' => (int) $row->qty,
                'value' => round((float) $row->value, 2),
                'avg_price' => ((int) $row->qty) > 0 ? round((float) $row->value / (int) $row->qty, 2) : null,
            ]);
        abort_if(count($monthly) === 0, 404);

        $hourly = (clone $base)
            ->selectRaw('SUBSTR(je_receipts.receipt_time, 1, 2) as h, SUM(je_items.qty) as qty')
            ->groupBy('h')
            ->get()
            ->keyBy(fn ($row) => (int) $row->h);
        $hourlyOut = [];
        for ($h = 0; $h < 24; $h++) {
            $hourlyOut[] = ['hour' => $h, 'qty' => (int) ($hourly->get($h)->qty ?? 0)];
        }

        $weekdays = (clone $base)
            ->selectRaw('je_receipts.receipt_date as d, SUM(je_items.qty) as qty')
            ->groupBy('d')
            ->get()
            ->groupBy(fn ($row) => (int) date('N', strtotime((string) $row->d)))
            ->map(fn ($days, $dow) => [
                'weekday' => self::RO_WEEKDAYS[$dow], 'dow' => $dow,
                'qty' => (int) $days->sum('qty'),
            ])
            ->sortBy('dow')
            ->values();

        // prețurile practicate de-a lungul timpului (din prețul unitar de pe
        // bon); pragurile marginale — reduceri punctuale, prețuri ajustate pe
        // un singur bon — sunt excluse ca să rămână doar prețurile reale de listă
        $priceRows = (clone $base)
            ->whereNotNull('je_items.unit_price')
            ->where('je_items.qty', '>', 0)
            ->selectRaw('je_items.unit_price, MIN(je_receipts.receipt_date) as first_seen, MAX(je_receipts.receipt_date) as last_seen, SUM(je_items.qty) as qty')
            ->groupBy('je_items.unit_price')
            ->orderBy('first_seen')
            ->get();
        $minQty = max(3, (int) ceil($priceRows->sum('qty') * 0.01));
        $prices = $priceRows
            ->filter(fn ($row) => (int) $row->qty >= $minQty)
            ->values()
            ->map(fn ($row) => [
                'price' => round((float) $row->unit_price, 2),
                'first_seen' => substr((string) $row->first_seen, 0, 10),
                'last_seen' => substr((string) $row->last_seen, 0, 10),
                'qty' => (int) $row->qty,
            ]);

        $totalQty = collect($monthly)->sum('qty');
        $totalValue = round(collect($monthly)->sum('value'), 2);
        $reportTotal = (float) $jeReport->total;

        return Inertia::render('Dashboard/JeReports/Product', [
            'report' => ['id' => $jeReport->id, 'fiscal_serial' => $jeReport->fiscal_serial],
            'name' => $name,
            'monthly' => $monthly,
            'hourly' => $hourlyOut,
            'weekdays' => $weekdays,
            'prices' => $prices,
            'summary' => [
                'qty' => $totalQty,
                'value' => $totalValue,
                'share' => $reportTotal > 0 ? round($totalValue / $reportTotal * 100, 1) : null,
            ],
            'insights' => $this->productInsights($name, $monthly, $hourlyOut, $weekdays, $prices, $totalQty, $totalValue, $reportTotal),
        ]);
    }

    private function monthRange(string $month): array
    {
        return ["{$month}-01", date('Y-m-t', strtotime("{$month}-01"))];
    }

    private function monthLabel(string $month): string
    {
        return self::RO_MONTHS[(int) substr($month, 5, 2)].' '.substr($month, 0, 4);
    }

    private function monthInsights($daily, $hourly, $weekdays, $products, $methods, ?array $prev): array
    {
        $out = [];
        $total = round(collect($daily)->sum('total'), 2);
        $n = collect($daily)->sum('n');
        $days = count($daily);
        $fmt = fn ($v) => number_format($v, 2, ',', '.');

        $out[] = "Vânzări totale: {$fmt($total)} lei din {$n} bonuri, în {$days} zile cu activitate "
            .'(medie '.$fmt($days ? $total / $days : 0).' lei/zi, bon mediu '.$fmt($n ? $total / $n : 0).' lei).';

        if ($prev && $prev['total'] > 0) {
            $delta = ($total - $prev['total']) / $prev['total'] * 100;
            $dir = $delta >= 0 ? 'peste' : 'sub';
            $out[] = 'Față de '.$prev['label'].' ('.$fmt($prev['total']).' lei): '
                .number_format(abs($delta), 1, ',', '.')."% {$dir} luna anterioară.";
        }

        $best = collect($daily)->sortByDesc('total')->first();
        $worst = collect($daily)->sortBy('total')->first();
        if ($best && $worst) {
            $out[] = 'Cea mai bună zi: '.date('d.m.Y', strtotime($best['receipt_date'])).' ('.$fmt($best['total']).' lei); '
                .'cea mai slabă: '.date('d.m.Y', strtotime($worst['receipt_date'])).' ('.$fmt($worst['total']).' lei).';
        }

        $topDow = collect($weekdays)->sortByDesc('avg')->first();
        if ($topDow) {
            $out[] = 'Cea mai puternică zi a săptămânii: '.$topDow['weekday']
                .' (medie '.$fmt($topDow['avg']).' lei/zi).';
        }

        $peak = collect($hourly)->sortByDesc('avg')->take(3)->pluck('hour')->sort()->values();
        if ($peak->count() === 3) {
            $out[] = 'Orele de vârf: '.$peak->map(fn ($h) => sprintf('%02d:00', $h))->implode(', ').'.';
        }

        $top = $products[0] ?? null;
        if ($top && $total > 0) {
            $share = round($top['value'] / $total * 100, 1);
            $out[] = "Cel mai vândut produs: {$top['name']} ({$top['qty']} buc., {$fmt($top['value'])} lei — {$share}% din luna respectivă).";
        }

        if ($total > 0) {
            $mix = collect($methods)->keyBy('pay_method');
            $cash = (float) ($mix['Numerar']['total'] ?? 0);
            $digital = $total - $cash;
            $out[] = 'Mix de încasare: '.number_format($cash / $total * 100, 1, ',', '.').'% numerar, '
                .number_format($digital / $total * 100, 1, ',', '.').'% plăți electronice.';
        }

        return $out;
    }

    private function productInsights(string $name, $monthly, $hourly, $weekdays, $prices, int $totalQty, float $totalValue, float $reportTotal): array
    {
        $out = [];
        $fmt = fn ($v) => number_format($v, 2, ',', '.');

        $share = $reportTotal > 0 ? round($totalValue / $reportTotal * 100, 1) : null;
        $out[] = "În total: {$totalQty} buc., {$fmt($totalValue)} lei"
            .($share !== null ? " — {$share}% din toate vânzările din raport." : '.');

        $best = collect($monthly)->sortByDesc('value')->first();
        if ($best) {
            $out[] = 'Cea mai bună lună: '.$this->monthLabel($best['month'])
                ." ({$best['qty']} buc., {$fmt($best['value'])} lei).";
        }

        $m = collect($monthly);
        if ($m->count() >= 6) {
            $recent = $m->slice(-3)->sum('value');
            $before = $m->slice(-6, 3)->sum('value');
            if ($before > 0) {
                $delta = ($recent - $before) / $before * 100;
                $dir = $delta >= 0 ? 'în creștere' : 'în scădere';
                $out[] = "Trend: ultimele 3 luni sunt {$dir} cu "
                    .number_format(abs($delta), 1, ',', '.').'% față de precedentele 3.';
            }
        }

        if (count($prices) > 1) {
            $first = $prices[0]['price'];
            $last = $prices[count($prices) - 1]['price'];
            if ($first > 0 && abs($last - $first) > 0.005) {
                $delta = ($last - $first) / $first * 100;
                $dir = $delta >= 0 ? 'a crescut' : 'a scăzut';
                $out[] = "Prețul {$dir} de la {$fmt($first)} lei la {$fmt($last)} lei ("
                    .($delta >= 0 ? '+' : '−').number_format(abs($delta), 1, ',', '.').'%).';
            }
        }

        $peak = collect($hourly)->sortByDesc('qty')->first();
        if ($peak && $peak['qty'] > 0) {
            $out[] = 'Ora la care se vinde cel mai des: '.sprintf('%02d:00', $peak['hour'])
                ." ({$peak['qty']} buc. în total).";
        }

        $topDow = collect($weekdays)->sortByDesc('qty')->first();
        if ($topDow) {
            $out[] = 'Ziua săptămânii cu cele mai multe vânzări: '.$topDow['weekday']
                ." ({$topDow['qty']} buc.).";
        }

        return $out;
    }

    public function destroy(JeReport $jeReport)
    {
        DB::transaction(function () use ($jeReport) {
            $jeReport->items()->delete();
            $jeReport->receipts()->delete();
            $jeReport->delete();
        });

        return redirect()
            ->route('dashboard.je-reports.index')
            ->with('success', 'Raportul a fost șters.');
    }

    public function export(JeReport $jeReport): StreamedResponse
    {
        // the receipts sheet is large; PhpSpreadsheet keeps everything in memory
        ini_set('memory_limit', '1024M');
        set_time_limit(300);

        $spreadsheet = new Spreadsheet;
        $moneyFormat = '#,##0.00';

        $monthNames = [
            '01' => 'Ianuarie', '02' => 'Februarie', '03' => 'Martie', '04' => 'Aprilie',
            '05' => 'Mai', '06' => 'Iunie', '07' => 'Iulie', '08' => 'August',
            '09' => 'Septembrie', '10' => 'Octombrie', '11' => 'Noiembrie', '12' => 'Decembrie',
        ];
        $monthName = fn (string $ym) => $monthNames[substr($ym, 5, 2)].' '.substr($ym, 0, 4);

        $daily = $jeReport->receipts()
            ->selectRaw('receipt_date, COUNT(*) as n, SUM(total) as total, '
                .implode(', ', array_map(fn ($c) => "SUM({$c}) as {$c}", self::METHOD_COLUMNS)))
            ->groupBy('receipt_date')
            ->orderBy('receipt_date')
            ->get();

        // Sumar (lunar)
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Sumar');
        $sheet->fromArray([
            ['Raport vânzări — jurnal electronic AMEF'],
            ['Serie fiscală', $jeReport->fiscal_serial, 'S/N', $jeReport->device_serial],
            ['Perioadă', $jeReport->period_from?->format('d.m.Y').' – '.$jeReport->period_to?->format('d.m.Y')],
            [],
            array_merge(['Luna', 'Nr. bonuri', 'Total (lei)'], self::METHOD_HEADERS),
        ]);
        $row = 6;
        $monthAgg = [];
        foreach ($daily as $d) {
            $ym = substr((string) $d->receipt_date, 0, 7);
            $monthAgg[$ym]['n'] = ($monthAgg[$ym]['n'] ?? 0) + (int) $d->n;
            $monthAgg[$ym]['total'] = ($monthAgg[$ym]['total'] ?? 0) + (float) $d->total;
            foreach (self::METHOD_COLUMNS as $c) {
                $monthAgg[$ym][$c] = ($monthAgg[$ym][$c] ?? 0) + (float) $d->{$c};
            }
        }
        foreach ($monthAgg as $ym => $agg) {
            $sheet->fromArray(array_merge(
                [$monthName($ym), $agg['n'], round($agg['total'], 2)],
                array_map(fn ($c) => round($agg[$c], 2), self::METHOD_COLUMNS),
            ), null, "A{$row}");
            $row++;
        }
        $sheet->fromArray(array_merge(
            ['TOTAL', $jeReport->receipts_count, (float) $jeReport->total],
            array_map(fn ($c) => round(array_sum(array_map(fn ($a) => $a[$c], $monthAgg)), 2), self::METHOD_COLUMNS),
        ), null, "A{$row}");
        $sheet->getStyle("C6:L{$row}")->getNumberFormat()->setFormatCode($moneyFormat);

        // Sumar zilnic
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Sumar zilnic');
        $sheet->fromArray(array_merge(['Data', 'Nr. bonuri', 'Total (lei)'], self::METHOD_HEADERS));
        $rows = [];
        foreach ($daily as $d) {
            $rows[] = array_merge(
                [substr((string) $d->receipt_date, 0, 10), (int) $d->n, round((float) $d->total, 2)],
                array_map(fn ($c) => round((float) $d->{$c}, 2), self::METHOD_COLUMNS),
            );
        }
        $sheet->fromArray($rows, null, 'A2');
        $sheet->getStyle('C2:L'.(count($rows) + 1))->getNumberFormat()->setFormatCode($moneyFormat);

        // Medie orară
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Medie orară');
        $sheet->fromArray(['Ora', 'Nr. bonuri', 'Total (lei)', 'Medie pe zi cu vânzări (lei)']);
        $rows = [];
        foreach ($this->hourlyAverages($jeReport, max(1, $daily->count())) as $h) {
            $rows[] = [sprintf('%02d:00', $h['hour']), $h['n'], $h['total'], $h['avg']];
        }
        $sheet->fromArray($rows, null, 'A2');
        $sheet->getStyle('C2:D'.(count($rows) + 1))->getNumberFormat()->setFormatCode($moneyFormat);

        // Pe metode de plată
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Pe metode de plată');
        $sheet->fromArray(['Metodă de plată', 'Nr. bonuri', 'Total (lei)']);
        $methods = $jeReport->receipts()
            ->selectRaw('pay_method, COUNT(*) as n, SUM(total) as total')
            ->groupBy('pay_method')
            ->orderByRaw('SUM(total) DESC')
            ->get();
        $rows = $methods->map(fn ($m) => [$m->pay_method, (int) $m->n, round((float) $m->total, 2)])->all();
        $sheet->fromArray($rows, null, 'A2');
        $sheet->getStyle('C2:C'.(count($rows) + 1))->getNumberFormat()->setFormatCode($moneyFormat);

        // Sumar produse
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Sumar produse');
        $sheet->fromArray(['Produs', 'Cantitate vândută', 'Valoare (lei)']);
        $products = $jeReport->items()
            ->selectRaw('name, SUM(qty) as qty, SUM(value) as value')
            ->groupBy('name')
            ->orderByRaw('SUM(value) DESC')
            ->get();
        $prow = 2;
        foreach ($products as $p) {
            // explicit string type so a name can never be interpreted as a formula
            $sheet->setCellValueExplicit("A{$prow}", $p->name, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue("B{$prow}", (int) $p->qty);
            $sheet->setCellValue("C{$prow}", round((float) $p->value, 2));
            $prow++;
        }
        $sheet->getStyle('C2:C'.max(2, $prow - 1))->getNumberFormat()->setFormatCode($moneyFormat);

        // Bonuri
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Bonuri');
        $sheet->fromArray(array_merge(
            ['Data', 'Ora', 'Z', 'BF', 'Total (lei)', 'Metodă de plată'],
            self::METHOD_HEADERS,
            ['CIF client', 'ID bon fiscal'],
        ));
        $row = 2;
        $jeReport->receipts()
            ->orderBy('receipt_date')->orderBy('receipt_time')
            ->chunk(2000, function ($receipts) use ($sheet, &$row) {
                $rows = [];
                $textCells = [];
                foreach ($receipts as $r) {
                    if ($r->cif_client !== null) {
                        $textCells['P'.($row + count($rows))] = $r->cif_client;
                    }
                    // 32-digit fiscal id: written explicitly as text, or Excel
                    // would coerce it to a float and destroy the digits
                    $textCells['Q'.($row + count($rows))] = $r->id_bf;
                    $rows[] = array_merge(
                        [
                            substr((string) $r->receipt_date, 0, 10),
                            $r->receipt_time,
                            $r->z,
                            $r->bf,
                            (float) $r->total,
                            $r->pay_method,
                        ],
                        array_map(fn ($c) => (float) $r->{$c} ?: null, self::METHOD_COLUMNS),
                        [null, null],
                    );
                }
                $sheet->fromArray($rows, null, "A{$row}");
                // journal-sourced free text goes in as explicit strings only
                foreach ($textCells as $cell => $value) {
                    $sheet->setCellValueExplicit($cell, $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                }
                $row += count($rows);
            });
        $sheet->getStyle('E2:E'.($row - 1))->getNumberFormat()->setFormatCode($moneyFormat);
        $sheet->getStyle('G2:O'.($row - 1))->getNumberFormat()->setFormatCode($moneyFormat);

        $spreadsheet->setActiveSheetIndex(0);

        $filename = sprintf(
            'raport-je-%s-%s-%s.xlsx',
            $jeReport->fiscal_serial ?? $jeReport->id,
            $jeReport->period_from?->format('Ymd'),
            $jeReport->period_to?->format('Ymd'),
        );

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Sales profile per hour of day: totals plus the average value of an hour
     * across the days on which the register was used.
     *
     * @return array<int, array{hour: int, n: int, total: float, avg: float}>
     */
    private function hourlyAverages(JeReport $jeReport, int $activeDays, ?string $from = null, ?string $to = null): array
    {
        $byHour = $jeReport->receipts()
            ->selectRaw('SUBSTR(receipt_time, 1, 2) as h, COUNT(*) as n, SUM(total) as total')
            ->when($from && $to, fn ($q) => $q->whereBetween('receipt_date', [$from, $to]))
            ->groupBy('h')
            ->get()
            ->keyBy(fn ($row) => (int) $row->h);

        $hours = [];
        for ($h = 0; $h < 24; $h++) {
            $row = $byHour->get($h);
            $total = $row ? round((float) $row->total, 2) : 0.0;
            $hours[] = [
                'hour' => $h,
                'n' => $row ? (int) $row->n : 0,
                'total' => $total,
                'avg' => round($total / $activeDays, 2),
            ];
        }

        return $hours;
    }

    /** Cast a DB aggregate row's numeric strings to floats for the frontend. */
    private function numericRow($row, array $overrides = []): array
    {
        $out = [];
        foreach ((array) $row->getAttributes() as $key => $value) {
            $out[$key] = is_numeric($value) ? round((float) $value, 2) : $value;
        }

        return array_merge($out, $overrides);
    }
}
