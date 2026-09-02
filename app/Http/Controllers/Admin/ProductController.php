<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class ProductController extends Controller
{
    private const UPLOAD_DIR = 'uploads/products';

    public function index()
    {
        $products = Product::orderBy('sort_order')->orderBy('name')->get()
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'description' => $p->description,
                'gramaj' => $p->gramaj,
                'category' => $p->category,
                'image' => $p->image,
                'source' => $p->source,
                'price' => $p->price,
                'price_with_muschi' => $p->price_with_muschi,
                'options' => $p->options ?? [],
                'one_option' => $p->one_option ?? [],
                'is_active' => $p->is_active,
                'is_limited_edition' => $p->is_limited_edition,
                'sort_order' => $p->sort_order,
            ]);

        return Inertia::render('Dashboard/Products', [
            'products' => $products,
            'categories' => Product::select('category')->distinct()->orderBy('category')->pluck('category'),
            'templates' => \App\Models\MenuTemplate::orderByDesc('created_at')->get()
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'auto' => $t->auto,
                    'product_count' => $t->product_count,
                    'created_at' => $t->created_at->format('d.m.Y H:i'),
                ]),
        ]);
    }

    /**
     * Pull the latest menu from Wolt straight from the dashboard. Runs the
     * `menu:import-wolt` command inline (a few dozen small image downloads,
     * usually well under a minute) and flashes back its summary.
     */
    public function importWolt(Request $request)
    {
        @set_time_limit(600);
        ignore_user_abort(true);

        try {
            Artisan::call('menu:import-wolt', ['--deactivate-missing' => true]);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Importul din Wolt a eșuat: '.$e->getMessage());
        }

        $lines = array_filter(array_map('trim', explode("\n", Artisan::output())));
        $summary = collect($lines)
            ->filter(fn ($l) => preg_match('/produse noi,|Dezactivate:|Niciun produs activ|articole în meniul/u', $l))
            ->implode(' · ');

        return back()->with('success', 'Import Wolt terminat. '.$summary);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['slug'] = Product::uniqueSlug($data['name']);
        $data['image'] = $this->storeImage($request);

        $this->makeRoomForSortOrder($data['sort_order']);
        Product::create($data);

        return redirect()->route('dashboard.products')->with('success', 'Produs adăugat.');
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validated($request);
        if ($data['name'] !== $product->name) {
            $data['slug'] = Product::uniqueSlug($data['name'], $product->id);
        }
        if ($image = $this->storeImage($request)) {
            $this->deleteImageFile($product->image);
            $data['image'] = $image;
        }

        if ($data['sort_order'] !== $product->sort_order) {
            $this->makeRoomForSortOrder($data['sort_order'], $product->id);
        }

        $product->update($data);

        return redirect()->route('dashboard.products')->with('success', 'Produs actualizat.');
    }

    /**
     * Reassign sort_order as 10, 20, 30 … in the current display order, leaving
     * gaps so future items can be slotted in between.
     */
    public function renumber()
    {
        $step = 10;
        Product::orderBy('sort_order')->orderBy('name')->get()
            ->each(function (Product $p, int $i) use ($step) {
                $p->updateQuietly(['sort_order' => ($i + 1) * $step]);
            });

        return back()->with('success', 'Ordinea produselor a fost renumerotată (10, 20, 30 …).');
    }

    /**
     * If another product already sits on this sort_order, shift it and every
     * product below it down by one so the new value can be inserted cleanly.
     */
    private function makeRoomForSortOrder(int $sortOrder, ?int $ignoreId = null): void
    {
        $taken = Product::where('sort_order', $sortOrder)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($taken) {
            Product::where('sort_order', '>=', $sortOrder)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->increment('sort_order');
        }
    }

    public function toggle(Request $request, Product $product)
    {
        $request->validate(['is_active' => 'required|boolean']);
        $product->update(['is_active' => $request->boolean('is_active')]);

        return response()->json(['ok' => true]);
    }

    public function destroy(Product $product)
    {
        $this->deleteImageFile($product->image);
        $product->delete();

        return redirect()->route('dashboard.products')->with('success', 'Produs șters.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'gramaj' => 'nullable|string|max:50',
            'category' => 'required|string|max:100',
            'price_lei' => 'required|numeric|min:0.01|max:100000',
            'price_with_muschi_lei' => 'nullable|numeric|min:0.01|max:100000',
            'options_text' => 'nullable|string|max:2000',
            'one_option_text' => 'nullable|string|max:2000',
            'is_active' => 'required|boolean',
            'is_limited_edition' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $lines = fn (?string $text) => array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $text))));

        return [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'gramaj' => $data['gramaj'] ?? null,
            'category' => $data['category'],
            'price' => (int) round($data['price_lei'] * 100),
            'price_with_muschi' => isset($data['price_with_muschi_lei']) && $data['price_with_muschi_lei'] !== null
                ? (int) round($data['price_with_muschi_lei'] * 100)
                : null,
            'options' => $lines($data['options_text'] ?? null) ?: null,
            'one_option' => $lines($data['one_option_text'] ?? null) ?: null,
            'is_active' => (bool) $data['is_active'],
            'is_limited_edition' => (bool) ($data['is_limited_edition'] ?? false),
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ];
    }

    /**
     * Product images live under public/uploads/products — served directly by
     * the web server, no storage:link symlink needed (shared-hosting safe).
     */
    private function storeImage(Request $request): ?string
    {
        $request->validate([
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
        ]);
        $file = $request->file('image');
        if (! $file) {
            return null;
        }

        $dir = public_path(self::UPLOAD_DIR);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $name = $file->hashName();
        $file->move($dir, $name);

        return '/'.self::UPLOAD_DIR.'/'.$name;
    }

    private function deleteImageFile(?string $image): void
    {
        if ($image && str_starts_with($image, '/'.self::UPLOAD_DIR.'/')) {
            $path = public_path(ltrim($image, '/'));
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
