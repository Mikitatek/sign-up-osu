<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Prod-safe: upserts by slug, never deletes. The cozonac seasonal products
     * keep the slugs the EditieLimitata page has always used; they stay
     * inactive until the campaign returns.
     */
    public function run(): void
    {
        $rows = [
            [
                'slug' => 'cozonac-ciocolata-merisoare-2025',
                'name' => 'Cozonac Artizanal Ciocolată cu Merișoare Învelit în Ciocolată Duo',
                'description' => 'Cozonac artizanal 750 g — ciocolată cu merișoare, învelit în ciocolată duo.',
                'category' => 'Ediție limitată',
                'image' => '/img/cozcioco.png',
                'price' => 3990,
                'is_active' => false,
            ],
            [
                'slug' => 'cozonac-nuca-ciocolata-2025',
                'name' => 'Cozonac Artizanal Nucă Învelit în Ciocolată',
                'description' => 'Cozonac artizanal 750 g — nucă, învelit în ciocolată.',
                'category' => 'Ediție limitată',
                'image' => '/img/coznuca.png',
                'price' => 3990,
                'is_active' => false,
            ],
            [
                'slug' => 'cozonac-zmeura-alba-2025',
                'name' => 'Cozonac Artizanal Zmeură Învelit în Ciocolată Albă',
                'description' => 'Cozonac artizanal 750 g — zmeură, învelit în ciocolată albă.',
                'category' => 'Ediție limitată',
                'image' => '/img/cozzmeura.png',
                'price' => 3990,
                'is_active' => false,
            ],
            [
                'slug' => 'cozonac-bundle-3x-2025',
                'name' => 'Pachet Cozonaci: 3 Bucăți (una din fiecare)',
                'description' => 'Pachet special cu 3 cozonaci artizanali (750 g fiecare).',
                'category' => 'Ediție limitată',
                'image' => '/img/cozbundle.png',
                'price' => 9990,
                'is_active' => false,
            ],
        ];

        foreach ($rows as $row) {
            Product::updateOrCreate(['slug' => $row['slug']], $row);
        }
    }
}
