<?php

namespace App\Services;

use App\Models\JeReceipt;
use App\Models\JeReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class JeReportImporter
{
    public function __construct(private JeParser $parser) {}

    /**
     * Parse raw journal contents and persist them as a report.
     *
     * @return array{report: ?JeReport, problems: array}
     */
    public function import(string $contents, string $filename, User $user): array
    {
        // a 15 MB journal expands to ~400k lines of PHP arrays while parsing
        if ($this->memoryLimitBytes() < 512 * 1024 * 1024) {
            ini_set('memory_limit', '512M');
        }

        $parsed = $this->parser->parse($contents);
        unset($contents);

        if ($parsed['problems'] !== []) {
            return ['report' => null, 'problems' => $parsed['problems']];
        }

        $receipts = $parsed['receipts'];
        if ($receipts === []) {
            return ['report' => null, 'problems' => ['Fișierul nu conține niciun bon fiscal.']];
        }

        $report = DB::transaction(function () use ($parsed, $receipts, $filename, $user) {
            $dates = array_column($receipts, 'date');
            $totalBani = array_sum(array_column($receipts, 'total'));
            $itemsCount = array_sum(array_map(fn ($r) => count($r['items']), $receipts));

            $report = JeReport::create([
                'original_filename' => mb_substr($filename, 0, 255),
                'device_serial' => $parsed['meta']['device_serial'],
                'fiscal_serial' => $parsed['meta']['fiscal_serial'],
                'period_from' => min($dates),
                'period_to' => max($dates),
                'receipts_count' => count($receipts),
                'items_count' => $itemsCount,
                'total' => JeParser::fmt($totalBani),
                'uploaded_by' => $user->id,
            ]);

            $rows = [];
            foreach ($receipts as $r) {
                $row = [
                    'je_report_id' => $report->id,
                    'receipt_date' => $r['date'],
                    'receipt_time' => $r['time'],
                    'z' => $r['z'],
                    'bf' => $r['bf'],
                    'id_bf' => $r['id_bf'],
                    'total' => JeParser::fmt($r['total']),
                    'pay_method' => JeParser::payLabel($r),
                    'numerar_eur_orig' => isset($r['pays']['numerar_eur'])
                        ? JeParser::fmt($r['pays']['numerar_eur'])
                        : null,
                    'cif_client' => $r['cif_client'],
                    'anulare_lines' => $r['anulare_lines'],
                ];
                foreach (array_keys(JeParser::METHOD_NAMES) as $key) {
                    $column = $key === 'numerar_eur' ? 'numerar_eur_lei' : $key;
                    $row[$column] = JeParser::fmt(JeParser::methodAmount($r, $key));
                }
                $rows[] = $row;
            }
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('je_receipts')->insert($chunk);
            }

            $receiptIds = JeReceipt::where('je_report_id', $report->id)
                ->pluck('id', 'id_bf');

            $itemRows = [];
            foreach ($receipts as $r) {
                $receiptId = $receiptIds[$r['id_bf']];
                foreach ($r['items'] as $item) {
                    $itemRows[] = [
                        'je_report_id' => $report->id,
                        'je_receipt_id' => $receiptId,
                        'name' => mb_substr($item['name'], 0, 255),
                        'qty' => $item['qty'],
                        'unit_price' => $item['price'] === null ? null : JeParser::fmt($item['price']),
                        'value' => JeParser::fmt($item['value']),
                    ];
                }
            }
            foreach (array_chunk($itemRows, 1000) as $chunk) {
                DB::table('je_items')->insert($chunk);
            }

            return $report;
        });

        return ['report' => $report, 'problems' => []];
    }

    private function memoryLimitBytes(): int
    {
        $limit = ini_get('memory_limit');
        if ($limit === false || $limit === '-1') {
            return PHP_INT_MAX;
        }
        $value = (int) $limit;

        return match (strtoupper(substr($limit, -1))) {
            'G' => $value * 1024 * 1024 * 1024,
            'M' => $value * 1024 * 1024,
            'K' => $value * 1024,
            default => $value,
        };
    }
}
