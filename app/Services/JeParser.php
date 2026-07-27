<?php

namespace App\Services;

use RuntimeException;

/**
 * Parser for AMEF electronic journal (.je) exports.
 *
 * The journal is a receipt-printer transcript: each fiscal receipt body is
 * followed by a footer block (Z/BF number, fiscal id, date, device serial)
 * and a "BON FISCAL" marker. All money amounts are handled in bani (integer
 * cents) so comparisons are exact.
 *
 * The parser is deliberately strict: any body line it cannot classify is
 * reported as a problem, and the built-in integrity checks (item sums vs.
 * receipt totals, payment sums vs. totals, receipts vs. daily Z reports)
 * must pass before an upload is accepted.
 */
class JeParser
{
    private const RE_FOOTER_BF = '/^Z:(\d+) BF:(\d+)\s+NR\.AMEF:(\d+)\s*$/';

    private const RE_FOOTER_NF = '/^\s+NR\.AMEF:\d+\s*$/';

    private const RE_IDBF = '/^ID BF:\s*(\d+)\s*$/';

    private const RE_DATA = '/^\s*DATA: (\d{2})-(\d{2})-(\d{4}) ORA: (\d{2}:\d{2}:\d{2})\s*$/';

    private const RE_ITEM = '/^(.*?)\s+(-?\d+) BUC\. X (\d+\.\d{2})= (-?\d+\.\d{2}) N\s*$/';

    private const RE_TOTAL = '/^TOTAL LEI\s+(-?\d+\.\d{2})\s*$/';

    private const RE_PAY = '/^(NUMERAR LEI|NUMERAR EUR|CARD LEI|CARD|ONLINE|TICHETE MASA|TICHETE VALORICE|VOUCHER|PLATA MODERNA|CREDIT|REST LEI|REST)\s+(-?\d+\.\d{2})\s*$/';

    private const RE_SEP = '/^[~ ]+$/';

    private const RE_HASH = '/^\s*[0-9A-F]{32}\s*$/';

    private const RE_DISCOUNT = '/^\s*(REDUCERE|MAJORARE)\s+([\d.]+%)\s+(-?\d+\.\d{2})\s*$/';

    private const RE_CIF_CLIENT = '/^\s*CIF CLIENT:\s*(\S+)\s*$/';

    private const RE_Z_TOTALVANZ = '/^VAL\. TOTAL VANZARI\s+(-?\d+\.\d{2})\s*$/';

    private const RE_Z_NRBON = '/^NUMAR BONURI FISCALE\s+(\d+)\s*$/';

    private const RE_Z_NR = '/^\s*Z NR:(\d+)\s*$/';

    private const RE_DEVICE_SERIAL = '/^SERIA APARATULUI:\s*(\S+)\s*$/';

    private const RE_FISCAL_SERIAL = '/^SERIA FISCALA:\s*(\S+)\s*$/';

    private const PAY_LABELS = [
        'NUMERAR LEI' => 'numerar',
        'NUMERAR EUR' => 'numerar_eur',
        'CARD LEI' => 'card',
        'CARD' => 'card',
        'ONLINE' => 'online',
        'TICHETE MASA' => 'tichete_masa',
        'TICHETE VALORICE' => 'tichete_valorice',
        'VOUCHER' => 'voucher',
        'PLATA MODERNA' => 'plata_moderna',
        'CREDIT' => 'credit',
        'REST LEI' => 'rest',
        'REST' => 'rest',
    ];

    public const LEI_METHODS = [
        'numerar', 'card', 'online', 'tichete_masa', 'tichete_valorice',
        'voucher', 'plata_moderna', 'credit',
    ];

    public const METHOD_NAMES = [
        'numerar' => 'Numerar',
        'card' => 'Card',
        'online' => 'Online',
        'tichete_masa' => 'Tichete masă',
        'tichete_valorice' => 'Tichete valorice',
        'voucher' => 'Voucher',
        'plata_moderna' => 'Plată modernă',
        'credit' => 'Credit',
        'numerar_eur' => 'Numerar EUR',
    ];

    private const IGNORABLE = [
        'SUBTOTAL', '-----', 'TOTAL NEPLATITOR TVA', '{LOGO}', 'BON FISCAL',
        'BON NEFISCAL', '** ANULARE **', '[SHA-256', 'CASIER', 'S/N:',
        'RAPORT DETALIAT', 'JURNAL ELECTRONIC', 'CAUTARE DUPA', 'DE LA ', 'LA  ',
        'CIF:', '(NEPLATITOR', 'PLATITOR',
    ];

    /**
     * @return array{meta: array, receipts: array, problems: array}
     */
    public function parse(string $contents): array
    {
        $contents = mb_convert_encoding($contents, 'UTF-8', 'ISO-8859-2');
        $lines = preg_split('/\r\n|\r|\n/', $contents);
        unset($contents);

        $meta = ['device_serial' => null, 'fiscal_serial' => null];
        $receipts = [];
        $zReports = [];
        $problems = [];
        $body = [];
        $companyLines = [];

        $n = count($lines);
        for ($i = 0; $i < $n; $i++) {
            $line = $lines[$i];

            if ($meta['device_serial'] === null && preg_match(self::RE_DEVICE_SERIAL, $line, $m)) {
                $meta['device_serial'] = $m[1];

                continue;
            }
            if ($meta['fiscal_serial'] === null && preg_match(self::RE_FISCAL_SERIAL, $line, $m)) {
                $meta['fiscal_serial'] = $m[1];

                continue;
            }

            if (preg_match(self::RE_FOOTER_BF, $line, $m)) {
                $footer = $this->readFooter($lines, $i, $n, $problems);
                $receipt = $this->parseBody($body, $problems, $i + 1, $companyLines);
                $receipt['z'] = (int) $m[1];
                $receipt['bf'] = (int) $m[2];
                $receipt['id_bf'] = $footer['id_bf'];
                $receipt['date'] = $footer['date'];
                $receipt['time'] = $footer['time'];
                $receipts[] = $receipt;
                $body = [];
                $i = $footer['next'] - 1;

                continue;
            }

            if (preg_match(self::RE_FOOTER_NF, $line) &&
                $i + 1 < $n && preg_match(self::RE_DATA, $lines[$i + 1])) {
                // non-fiscal document footer (Z/X reports etc.)
                $z = $this->parseZBody($body);
                if ($z !== null) {
                    $zReports[$z['z']] = $z;
                }
                $body = [];
                $i++;

                continue;
            }

            $body[] = $line;
        }

        $this->checkIntegrity($receipts, $zReports, $problems);

        return ['meta' => $meta, 'receipts' => $receipts, 'problems' => $problems];
    }

    /**
     * @return array{id_bf: ?string, date: ?string, time: ?string, next: int}
     */
    private function readFooter(array $lines, int $i, int $n, array &$problems): array
    {
        $idBf = $date = $time = null;
        $j = $i + 1;
        $found = false;
        for (; $j < $n && $j < $i + 6; $j++) {
            $l = $lines[$j];
            if (preg_match(self::RE_IDBF, $l, $m)) {
                $idBf = $m[1];
            } elseif (preg_match(self::RE_DATA, $l, $m)) {
                $date = "{$m[3]}-{$m[2]}-{$m[1]}"; // ISO
                $time = $m[4];
            } elseif (trim($l) === 'BON FISCAL') {
                $found = true;
                break;
            }
        }
        if (! $found) {
            $problems[] = 'Linia '.($i + 1).': footer de bon fără marcajul BON FISCAL.';
        }

        return ['id_bf' => $idBf, 'date' => $date, 'time' => $time, 'next' => $j + 1];
    }

    private function parseBody(array $body, array &$problems, int $loc, array &$companyLines): array
    {
        // join wrapped item lines: a bare product-name line followed by a
        // continuation line whose name part is empty
        $joined = [];
        for ($k = 0, $len = count($body); $k < $len; $k++) {
            $line = $body[$k];
            if ($k + 1 < $len) {
                $next = $body[$k + 1];
                $s = trim($line);
                if ($s !== '' && ! str_contains($s, '=')
                    && ! preg_match(self::RE_SEP, $line)
                    && ! preg_match(self::RE_PAY, $line)
                    && ! $this->isIgnorable($s)
                    && preg_match(self::RE_ITEM, $next, $mn) && trim($mn[1]) === '') {
                    $joined[] = $s.' '.ltrim($next);
                    $k++;

                    continue;
                }
            }
            $joined[] = $line;
        }

        $items = [];
        $pays = [];
        $total = null;
        $anulare = 0;
        $cifClient = null;

        foreach ($joined as $line) {
            $s = trim($line);
            if ($s === '' || preg_match(self::RE_SEP, $line)) {
                continue;
            }
            if ($s === '** ANULARE **') {
                $anulare++;

                continue;
            }
            if (preg_match(self::RE_CIF_CLIENT, $line, $m)) {
                $cifClient = $m[1];

                continue;
            }
            if (preg_match(self::RE_TOTAL, $line, $m)) {
                $total = self::toBani($m[1]);

                continue;
            }
            if (preg_match(self::RE_PAY, $line, $m)) {
                $key = self::PAY_LABELS[$m[1]];
                $pays[$key] = ($pays[$key] ?? 0) + self::toBani($m[2]);

                continue;
            }
            if (preg_match(self::RE_DISCOUNT, $line, $m)) {
                $items[] = ['name' => "{$m[1]} {$m[2]}", 'qty' => null, 'price' => null, 'value' => self::toBani($m[3])];

                continue;
            }
            if (preg_match(self::RE_ITEM, $line, $m) && trim($m[1]) !== '') {
                $items[] = [
                    'name' => trim($m[1]),
                    'qty' => (int) $m[2],
                    'price' => self::toBani($m[3]),
                    'value' => self::toBani($m[4]),
                ];

                continue;
            }
            if ($this->isIgnorable($s) || preg_match(self::RE_HASH, $line) || str_starts_with($s, 'PROB')) {
                continue;
            }
            // company header lines (name/address) repeat on every receipt; learn
            // them from the first receipts instead of hardcoding the company
            if (count($items) === 0 && $total === null && $s === mb_strtoupper($s)) {
                $companyLines[$s] = true;

                continue;
            }
            if (isset($companyLines[$s])) {
                continue;
            }
            $problems[] = "Bon terminat la linia {$loc}: linie nerecunoscută: ".trim($line);
        }

        return [
            'items' => $items,
            'total' => $total,
            'pays' => $pays,
            'anulare_lines' => $anulare,
            'cif_client' => $cifClient,
        ];
    }

    private function parseZBody(array $body): ?array
    {
        $z = $total = $nrBon = null;
        foreach ($body as $line) {
            if (preg_match(self::RE_Z_NR, $line, $m)) {
                $z = (int) $m[1];
            } elseif (preg_match(self::RE_Z_TOTALVANZ, $line, $m)) {
                $total = self::toBani($m[1]);
            } elseif (preg_match(self::RE_Z_NRBON, $line, $m)) {
                $nrBon = (int) $m[1];
            }
        }

        return ($z !== null && $total !== null && $nrBon !== null)
            ? ['z' => $z, 'total' => $total, 'nr_bonuri' => $nrBon]
            : null;
    }

    private function checkIntegrity(array $receipts, array $zReports, array &$problems): void
    {
        $byZTotal = [];
        $byZCount = [];
        $seenIdBf = [];

        foreach ($receipts as $r) {
            if ($r['total'] === null || $r['date'] === null || $r['id_bf'] === null) {
                $problems[] = "Bon incomplet: Z{$r['z']} BF{$r['bf']}.";

                continue;
            }

            if (isset($seenIdBf[$r['id_bf']])) {
                $problems[] = "ID bon fiscal duplicat în jurnal: {$r['id_bf']} (Z{$r['z']} BF{$r['bf']}).";

                continue;
            }
            $seenIdBf[$r['id_bf']] = true;

            $itemSum = array_sum(array_column($r['items'], 'value'));
            if ($itemSum !== $r['total']) {
                $problems[] = "Z{$r['z']} BF{$r['bf']} ({$r['date']}): suma articolelor (".self::fmt($itemSum).') diferă de totalul bonului ('.self::fmt($r['total']).').';
            }

            if (! isset($r['pays']['numerar_eur'])) {
                $paid = -($r['pays']['rest'] ?? 0);
                foreach (self::LEI_METHODS as $mkey) {
                    $paid += $r['pays'][$mkey] ?? 0;
                }
                if ($paid !== $r['total']) {
                    $problems[] = "Z{$r['z']} BF{$r['bf']} ({$r['date']}): suma plăților (".self::fmt($paid).') diferă de totalul bonului ('.self::fmt($r['total']).').';
                }
            }

            $byZTotal[$r['z']] = ($byZTotal[$r['z']] ?? 0) + $r['total'];
            $byZCount[$r['z']] = ($byZCount[$r['z']] ?? 0) + 1;
        }

        foreach ($zReports as $z => $zr) {
            $sum = $byZTotal[$z] ?? 0;
            $count = $byZCount[$z] ?? 0;
            if ($sum !== $zr['total'] || $count !== $zr['nr_bonuri']) {
                $problems[] = "Raport Z{$z}: bonurile din jurnal (".self::fmt($sum).", {$count} bonuri) nu corespund raportului fiscal zilnic (".self::fmt($zr['total']).", {$zr['nr_bonuri']} bonuri).";
            }
        }
    }

    /**
     * Net LEI amount collected via one payment method, in bani.
     * Cash is net of change; the EUR method covers whatever LEI amount the
     * other methods did not (the journal prints the tendered EUR amount).
     */
    public static function methodAmount(array $receipt, string $key): int
    {
        $pays = $receipt['pays'];
        if ($key === 'numerar_eur') {
            if (empty($pays['numerar_eur'])) {
                return 0;
            }
            $others = -($pays['rest'] ?? 0);
            foreach (self::LEI_METHODS as $mkey) {
                $others += $pays[$mkey] ?? 0;
            }

            return $receipt['total'] - $others;
        }
        $v = $pays[$key] ?? 0;
        if ($key === 'numerar') {
            $v -= $pays['rest'] ?? 0;
        }

        return $v;
    }

    /** Human label naming the method(s) the receipt was paid with. */
    public static function payLabel(array $receipt): string
    {
        $used = [];
        foreach (array_keys(self::METHOD_NAMES) as $key) {
            if (self::methodAmount($receipt, $key) !== 0) {
                $used[] = self::METHOD_NAMES[$key];
            }
        }

        return $used === [] ? '—' : implode(' + ', $used);
    }

    private function isIgnorable(string $s): bool
    {
        foreach (self::IGNORABLE as $needle) {
            if (str_contains($s, $needle)) {
                return true;
            }
        }

        return false;
    }

    private static function toBani(string $amount): int
    {
        if (! preg_match('/^(-?)(\d+)\.(\d{2})$/', $amount, $m)) {
            throw new RuntimeException("Sumă invalidă în jurnal: {$amount}");
        }

        return ($m[1] === '-' ? -1 : 1) * ((int) $m[2] * 100 + (int) $m[3]);
    }

    public static function fmt(int $bani): string
    {
        return number_format($bani / 100, 2, '.', '');
    }
}
