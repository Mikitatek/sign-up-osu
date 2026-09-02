<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Wolt doesn't list a weight for the langoș or the hot drinks, so fill in
     * rough by-eye estimates. Only touches rows that have no gramaj yet, so a
     * value typed later in the CRM is never overwritten. The Wolt importer
     * carries the same fallback table for fresh imports.
     */
    public function up(): void
    {
        $estimates = [
            // Langoș — ~150 g of dough plus toppings
            'Langos Simplu' => '170 g',
            'Langos Smântână' => '200 g',
            'Langos Nutella' => '210 g',
            'Langos Dulceață' => '210 g',
            'Langos Gem' => '210 g',
            'Langos Cașcaval' => '240 g',
            'Langos Telemea cu Mărar' => '240 g',
            'Langos Telemea și Mărar' => '240 g',
            'Langos Papanaș' => '270 g',
            'Langos Țărănesc' => '320 g',
            'Langos Italian' => '310 g',
            // Băuturi calde
            'Espresso Scurt' => '30 ml',
            'Espresso Lung' => '50 ml',
            'Espresso Dublu' => '60 ml',
            'Latte' => '250 ml',
            'Ceai' => '300 ml',
            'Ciocolată Caldă cu Bezele la Jar' => '250 ml',
        ];

        foreach ($estimates as $name => $gramaj) {
            DB::table('products')
                ->where('name', $name)
                ->where(fn ($q) => $q->whereNull('gramaj')->orWhere('gramaj', ''))
                ->update(['gramaj' => $gramaj]);
        }
    }

    public function down(): void
    {
        // Estimates only; nothing to roll back.
    }
};
