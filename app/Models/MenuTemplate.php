<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuTemplate extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'auto' => 'boolean',
        ];
    }

    /** Columns captured for each product in a snapshot. */
    public const PRODUCT_FIELDS = [
        'slug', 'name', 'description', 'gramaj', 'category', 'image',
        'price', 'price_with_muschi', 'options', 'one_option',
        'is_active', 'is_limited_edition', 'sort_order', 'source', 'external_id',
    ];
}
