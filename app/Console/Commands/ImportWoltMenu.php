<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ImportWoltMenu extends Command
{
    protected $signature = 'menu:import-wolt
        {url? : Wolt venue URL (defaults to the Oșu Kürtős și Langoș page)}
        {--dry-run : Show what would change without writing anything}
        {--deactivate-missing : Hide active products that are no longer on the Wolt menu}
        {--skip-images : Do not download product images}';

    private const IMAGE_DIR = 'uploads/products';

    protected $description = 'Import the menu (items, prices, portion sizes) from a public Wolt venue page into the local products table';

    private const DEFAULT_URL = 'https://wolt.com/en/rou/brasov/restaurant/osu-kurtos-si-langos-68401c708ee8e53ebc2befa9';

    /** Wolt groups some items under an all-caps promo category; fold it into the shop's own label. */
    private const CATEGORY_ALIASES = [
        'EDIȚIE LIMITATĂ' => 'Ediție limitată',
    ];

    /**
     * By-eye portion sizes for items Wolt lists without a weight. Only used when
     * the product has no gramaj yet — a value set in the CRM always wins.
     * Keys are lower-cased names. Keep in sync with the backfill migration.
     */
    private const GRAMAJ_FALLBACK = [
        'langos simplu' => '170 g',
        'langos smântână' => '200 g',
        'langos nutella' => '210 g',
        'langos dulceață' => '210 g',
        'langos gem' => '210 g',
        'langos cașcaval' => '240 g',
        'langos telemea cu mărar' => '240 g',
        'langos telemea și mărar' => '240 g',
        'langos papanaș' => '270 g',
        'langos țărănesc' => '320 g',
        'langos italian' => '310 g',
        'espresso scurt' => '30 ml',
        'espresso lung' => '50 ml',
        'espresso dublu' => '60 ml',
        'latte' => '250 ml',
        'ceai' => '300 ml',
        'ciocolată caldă cu bezele la jar' => '250 ml',
    ];

    public function handle(): int
    {
        $url = $this->argument('url') ?: self::DEFAULT_URL;
        $dry = (bool) $this->option('dry-run');

        $this->info(($dry ? '[dry-run] ' : '').'Se citește meniul de pe: '.$url);

        $menu = $this->fetchMenu($url);
        if ($menu === null) {
            return self::FAILURE;
        }

        [$categories, $items] = $menu;

        $categoryOf = [];
        foreach ($categories as $cat) {
            $label = self::CATEGORY_ALIASES[$cat['name']] ?? $cat['name'];
            foreach ($cat['item_ids'] ?? [] as $id) {
                $categoryOf[$id] = $label;
            }
        }

        // De-dupe items that appear in more than one category (same name); the
        // promo "Ediție limitată" copy loses so the real category wins.
        usort($items, function ($a, $b) use ($categoryOf) {
            $la = ($categoryOf[$a['id']] ?? '') === 'Ediție limitată' ? 1 : 0;
            $lb = ($categoryOf[$b['id']] ?? '') === 'Ediție limitată' ? 1 : 0;

            return $la <=> $lb;
        });

        $seen = [];
        $touched = [];
        $new = 0;
        $updated = 0;

        foreach ($items as $item) {
            $name = trim($item['name'] ?? '');
            if ($name === '') {
                continue;
            }
            $key = mb_strtolower($name);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            [$woltGramaj, $description] = $this->splitGramaj($item['description'] ?? '');
            $price = (int) ($item['price'] ?? 0);
            $category = $categoryOf[$item['id']] ?? 'Altele';
            $woltImage = $item['images'][0]['url'] ?? null;

            $product = Product::where('source', 'wolt')->where('external_id', $item['id'])->first()
                ?: Product::where('name', $name)->first()
                ?: new Product;

            $isNew = ! $product->exists;

            // Wolt's weight wins when it has one; otherwise keep what's already
            // on the product (a CRM edit or an earlier estimate), then fall back
            // to the by-eye table.
            $gramaj = $woltGramaj
                ?: ($product->gramaj ?: (self::GRAMAJ_FALLBACK[$key] ?? null));

            // Only a genuine CRM upload (a local /uploads/products file that
            // isn't one of our Wolt copies) is protected; Stripe or Wolt-CDN
            // URLs get replaced by a freshly downloaded local image.
            $keepImage = $product->image
                && Str::startsWith($product->image, '/'.self::IMAGE_DIR.'/')
                && ! Str::startsWith($product->image, '/'.self::IMAGE_DIR.'/wolt-')
                && ! $isNew;

            // Local, self-hosted path (deterministic from the Wolt URL, so a
            // re-import reuses the already-downloaded file). Wolt's own CDN is
            // blocked by the site CSP, hence the copy.
            $targetImage = match (true) {
                $keepImage => $product->image,
                (bool) $this->option('skip-images') => $product->image,
                default => $this->localImagePath($woltImage) ?? $product->image,
            };

            $changes = $this->diff($product, [
                'name' => $name,
                'description' => $description,
                'gramaj' => $gramaj,
                'category' => $category,
                'price' => $price,
                'image' => $targetImage,
            ]);

            if ($isNew) {
                $new++;
                $this->line("  <fg=green>+ nou</> {$name} — ".number_format($price / 100, 2).' lei'
                    .($gramaj ? " ({$gramaj})" : '')." [{$category}]");
            } elseif ($changes !== []) {
                $updated++;
                $this->line("  <fg=yellow>~ modif</> {$name}: ".implode(', ', $changes));
            }

            if (! $dry) {
                $product->name = $name;
                $product->description = $description;
                $product->gramaj = $gramaj;
                $product->category = $category;
                $product->price = $price;
                $product->source = 'wolt';
                $product->external_id = $item['id'];
                $product->is_active = true;
                if (! $keepImage && ! $this->option('skip-images') && $woltImage) {
                    $product->image = $this->downloadImage($woltImage) ?? $product->image;
                }
                if (! $product->slug) {
                    $product->slug = Product::uniqueSlug($name, $product->id);
                }
                $product->save();
                $touched[] = $product->id;
            }
        }

        $this->newLine();
        $this->info(($dry ? 'Ar fi: ' : '')."{$new} produse noi, {$updated} actualizate.");

        $this->handleMissing($dry, $touched);

        if ($dry) {
            $this->comment('Nimic nu a fost salvat (dry-run). Rulează fără --dry-run pentru a aplica.');
        }

        return self::SUCCESS;
    }

    /** @return array{0: array<int,array>, 1: array<int,array>}|null */
    private function fetchMenu(string $url): ?array
    {
        $res = Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
            'Accept-Language' => 'ro,en;q=0.8',
        ])->timeout(30)->retry(2, 700)->get($url);

        if (! $res->successful()) {
            $this->error("Wolt a răspuns cu HTTP {$res->status()}.");

            return null;
        }

        if (! preg_match('/<script type="application\/json" class="query-state">(.*?)<\/script>/s', $res->body(), $m)) {
            $this->error('Nu am găsit datele meniului în pagină (structura Wolt s-a schimbat?).');

            return null;
        }

        $state = json_decode($m[1], true);
        $data = null;
        foreach ($state['queries'] ?? [] as $q) {
            if (str_contains(json_encode($q['queryKey'] ?? []), 'category-listing')) {
                $data = $q['state']['data'] ?? null;
                break;
            }
        }

        if (! is_array($data) || ! isset($data['items'], $data['categories'])) {
            $this->error('Meniul Wolt a fost găsit dar e gol sau într-un format neașteptat.');

            return null;
        }

        $this->info(count($data['items']).' articole în meniul Wolt.');

        return [$data['categories'], $data['items']];
    }

    /**
     * Pull a trailing portion size ("200g", "330ml", "0.5 l") out of the Wolt
     * description and return [gramaj|null, cleanedDescription|null].
     *
     * @return array{0: ?string, 1: ?string}
     */
    private function splitGramaj(string $raw): array
    {
        $lines = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $raw))));
        $unit = '(kg|g|gr|grame|ml|l)';
        $gramaj = null;

        if ($lines !== []) {
            $last = end($lines);
            if (preg_match('/^(\d+(?:[.,]\d+)?)\s*'.$unit.'\.?$/iu', $last, $m)) {
                $gramaj = $this->formatGramaj($m[1], $m[2]);
                array_pop($lines);
            } elseif (preg_match('/(\d+(?:[.,]\d+)?)\s*'.$unit.'\.?$/iu', $last, $m)) {
                $gramaj = $this->formatGramaj($m[1], $m[2]);
                $lines[count($lines) - 1] = trim(preg_replace('/\s*'.preg_quote($m[0], '/').'$/u', '', $last));
            }
        }

        $description = trim(implode("\n", array_filter($lines)));

        return [$gramaj, $description !== '' ? $description : null];
    }

    private function formatGramaj(string $number, string $unit): string
    {
        $unit = mb_strtolower($unit);
        $unit = in_array($unit, ['gr', 'grame'], true) ? 'g' : $unit;

        return str_replace(',', '.', $number).' '.$unit;
    }

    /** Deterministic local path a Wolt image URL maps to (no I/O). */
    private function localImagePath(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        return '/'.self::IMAGE_DIR.'/wolt-'.sha1($url).'.jpg';
    }

    /**
     * Download a Wolt image into public/uploads/products and return its local
     * path. Re-uses the file if it was fetched on an earlier run. Returns null
     * if the download fails so the caller can keep whatever it already had.
     */
    private function downloadImage(string $url): ?string
    {
        $path = $this->localImagePath($url);
        $abs = public_path(ltrim($path, '/'));

        if (is_file($abs) && filesize($abs) > 0) {
            return $path;
        }

        if (! is_dir(dirname($abs))) {
            mkdir(dirname($abs), 0755, true);
        }

        try {
            $res = Http::timeout(15)->get($url);
            if (! $res->successful() || ! str_starts_with((string) $res->header('Content-Type'), 'image/')) {
                $this->warn("  imagine sărită ({$url})");

                return null;
            }
            file_put_contents($abs, $res->body());
        } catch (\Throwable $e) {
            $this->warn("  imagine eșuată ({$url}): {$e->getMessage()}");

            return null;
        }

        return $path;
    }

    /**
     * @param  array<string,mixed>  $incoming
     * @return list<string>
     */
    private function diff(Product $product, array $incoming): array
    {
        if (! $product->exists) {
            return [];
        }

        $out = [];
        foreach ($incoming as $field => $value) {
            $current = $product->getOriginal($field);
            if ((string) $current !== (string) $value) {
                $show = fn ($v) => $field === 'price' ? number_format(((int) $v) / 100, 2) : ($v ?: '∅');
                $out[] = "{$field} {$show($current)}→{$show($value)}";
            }
        }

        return $out;
    }

    private function handleMissing(bool $dry, array $touched): void
    {
        if (! $this->option('deactivate-missing')) {
            return;
        }

        $missing = Product::where('is_active', true)
            ->when($touched !== [], fn ($q) => $q->whereNotIn('id', $touched))
            ->get(['id', 'name']);

        if ($missing->isEmpty()) {
            $this->info('Niciun produs activ în plus față de meniul Wolt.');

            return;
        }

        foreach ($missing as $p) {
            $this->line("  <fg=red>- ascuns</> {$p->name}");
        }

        if (! $dry) {
            Product::whereIn('id', $missing->pluck('id'))->update(['is_active' => false]);
        }

        $this->info(($dry ? 'Ar fi dezactivate: ' : 'Dezactivate: ').$missing->count().' produse.');
    }
}
