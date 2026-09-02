<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'one_option' => 'array',
            'is_active' => 'boolean',
            'is_limited_edition' => 'boolean',
            'price' => 'integer',
            'price_with_muschi' => 'integer',
        ];
    }

    public static function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'produs';
        $slug = $base;
        $i = 2;
        while (static::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    /** The shape the storefront JS has always consumed (Stripe-compatible). */
    public function toStorefrontArray(): array
    {
        $prices = [[
            'id' => 'basic',
            'unit_amount' => $this->price,
            'metadata' => ['option' => 'basic'],
        ]];
        if ($this->price_with_muschi) {
            $prices[] = [
                'id' => 'with_muschi',
                'unit_amount' => $this->price_with_muschi,
                'metadata' => ['option' => 'with_muschi'],
            ];
        }

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'prices' => $prices,
            'image' => $this->image ?: '/images/default.jpg',
            'category' => $this->category,
            'is_limited_edition' => (bool) $this->is_limited_edition,
            'sort_order' => (int) $this->sort_order,
            'metadata' => array_filter([
                'category' => $this->category,
                'gramaj' => $this->gramaj,
                'options' => $this->options ? json_encode($this->options) : null,
                'oneoption' => $this->one_option ? json_encode($this->one_option) : null,
            ]),
            'is_active' => $this->is_active,
        ];
    }
}
