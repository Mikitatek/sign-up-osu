<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuTemplate;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MenuTemplateController extends Controller
{
    /** Save the current catalog as a named, restorable template. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:120',
        ]);

        $template = $this->snapshot(
            $data['name'] ?: 'Meniu '.now()->format('d.m.Y H:i'),
        );

        return back()->with(
            'success',
            "Meniu salvat ca template „{$template->name}” ({$template->product_count} produse).",
        );
    }

    /**
     * Restore a template: the catalog is auto-backed-up first, then every
     * product in the template is upserted by slug and any product not in the
     * template is deactivated (never deleted).
     */
    public function restore(MenuTemplate $menuTemplate)
    {
        $this->snapshot('Automat înainte de restaurare — '.now()->format('d.m.Y H:i'), auto: true);

        [$applied, $hidden] = DB::transaction(function () use ($menuTemplate) {
            $slugs = [];

            foreach ($menuTemplate->payload as $row) {
                $row = collect($row)->only(MenuTemplate::PRODUCT_FIELDS)->all();
                if (empty($row['slug'])) {
                    continue;
                }
                $slugs[] = $row['slug'];
                Product::updateOrCreate(['slug' => $row['slug']], $row);
            }

            $hidden = $slugs === []
                ? 0
                : Product::whereNotIn('slug', $slugs)->where('is_active', true)->update(['is_active' => false]);

            return [count($slugs), $hidden];
        });

        return back()->with(
            'success',
            "Meniu restaurat din „{$menuTemplate->name}”: {$applied} produse aplicate, "
                ."{$hidden} ascunse. (S-a salvat automat un backup al meniului anterior.)",
        );
    }

    public function destroy(MenuTemplate $menuTemplate)
    {
        $menuTemplate->delete();

        return back()->with('success', 'Template șters.');
    }

    private function snapshot(string $name, bool $auto = false): MenuTemplate
    {
        $payload = Product::orderBy('sort_order')->orderBy('name')->get()
            ->map(fn (Product $p) => collect($p->toArray())->only(MenuTemplate::PRODUCT_FIELDS)->all())
            ->all();

        return MenuTemplate::create([
            'name' => $name,
            'auto' => $auto,
            'product_count' => count($payload),
            'payload' => $payload,
        ]);
    }
}
