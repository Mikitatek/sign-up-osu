<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
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
                'category' => $p->category,
                'image' => $p->image,
                'price' => $p->price,
                'price_with_muschi' => $p->price_with_muschi,
                'options' => $p->options ?? [],
                'one_option' => $p->one_option ?? [],
                'is_active' => $p->is_active,
                'sort_order' => $p->sort_order,
            ]);

        return Inertia::render('Dashboard/Products', [
            'products' => $products,
            'categories' => Product::select('category')->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['slug'] = Product::uniqueSlug($data['name']);
        $data['image'] = $this->storeImage($request);

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

        $product->update($data);

        return redirect()->route('dashboard.products')->with('success', 'Produs actualizat.');
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
            'category' => 'required|string|max:100',
            'price_lei' => 'required|numeric|min:0.01|max:100000',
            'price_with_muschi_lei' => 'nullable|numeric|min:0.01|max:100000',
            'options_text' => 'nullable|string|max:2000',
            'one_option_text' => 'nullable|string|max:2000',
            'is_active' => 'required|boolean',
            'sort_order' => 'nullable|integer|min:0|max:100000',
        ]);

        $lines = fn (?string $text) => array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $text))));

        return [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'price' => (int) round($data['price_lei'] * 100),
            'price_with_muschi' => isset($data['price_with_muschi_lei']) && $data['price_with_muschi_lei'] !== null
                ? (int) round($data['price_with_muschi_lei'] * 100)
                : null,
            'options' => $lines($data['options_text'] ?? null) ?: null,
            'one_option' => $lines($data['one_option_text'] ?? null) ?: null,
            'is_active' => (bool) $data['is_active'],
            'sort_order' => $data['sort_order'] ?? 0,
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
