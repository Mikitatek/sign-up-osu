<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Stripe\Price;
use Stripe\Stripe;

class ImportStripeProducts extends Command
{
    protected $signature = 'products:import-stripe {--deactivate-missing : Deactivate local products that no longer exist in Stripe}';

    protected $description = 'One-time import of the Stripe catalog into the local products table (upserts by name)';

    public function handle(): int
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $stripeProducts = \Stripe\Product::all(['limit' => 100, 'active' => true])->data;
        $this->info(count($stripeProducts).' produse găsite în Stripe.');

        $imported = [];
        foreach ($stripeProducts as $sp) {
            $prices = Price::all(['product' => $sp->id, 'active' => true, 'limit' => 100])->data;

            $basic = $withMuschi = $fallback = null;
            foreach ($prices as $price) {
                $meta = mb_strtolower($price->metadata['option'] ?? '');
                if ($meta === 'basic') {
                    $basic ??= $price;
                } elseif ($meta === 'with_muschi') {
                    $withMuschi ??= $price;
                }
                if ($fallback === null && $price->unit_amount > 0) {
                    $fallback = $price;
                }
            }
            $base = $basic ?? $fallback;
            if (! $base) {
                $this->warn("Sar peste „{$sp->name}” — nu are niciun preț activ pozitiv.");

                continue;
            }

            $metadata = $sp->metadata->toArray();
            $options = isset($metadata['options']) ? json_decode($metadata['options'], true) : null;
            $oneOption = isset($metadata['oneoption']) ? json_decode($metadata['oneoption'], true) : null;

            $product = Product::updateOrCreate(
                ['name' => $sp->name],
                [
                    'description' => $sp->description,
                    'category' => $metadata['category'] ?? 'Altele',
                    'image' => $sp->images[0] ?? null,
                    'price' => $base->unit_amount,
                    'price_with_muschi' => $withMuschi?->unit_amount,
                    'options' => $options ?: null,
                    'one_option' => $oneOption ?: null,
                    'is_active' => true,
                ]
            );
            if (! $product->slug) {
                $product->update(['slug' => Product::uniqueSlug($product->name, $product->id)]);
            }
            $imported[] = $product->id;
            $this->line("  ✓ {$sp->name} — ".number_format($base->unit_amount / 100, 2).' lei'
                .($withMuschi ? ' / cu mușchi '.number_format($withMuschi->unit_amount / 100, 2).' lei' : ''));
        }

        if ($this->option('deactivate-missing') && $imported !== []) {
            $n = Product::whereNotIn('id', $imported)->update(['is_active' => false]);
            $this->info("{$n} produse locale fără corespondent în Stripe au fost dezactivate.");
        }

        $this->info('Gata. Produsele sunt acum în tabela locală `products`.');

        return self::SUCCESS;
    }
}
