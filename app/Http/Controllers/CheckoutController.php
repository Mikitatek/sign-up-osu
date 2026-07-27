<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\PromotionCode;
use Stripe\Stripe;

/**
 * Card checkout via Stripe.
 *
 * Nothing money-related is trusted from the browser: unit prices come from the
 * local products table, promo codes are redeemed by Stripe itself (which
 * enforces expiry, redemption limits and per-customer restrictions), and the
 * transport fee is recomputed from the delivery type and the cart's own
 * contents. The client-side price/discount/total fields are ignored.
 */
class CheckoutController extends Controller
{
    private const TRANSPORT_FEE = 1800; // bani

    /** free-transport thresholds (bani) */
    private const THRESHOLD_MAGAZIN = 8000;

    private const THRESHOLD_EDITIE = 6000;

    private const CATEGORY_EDITIE = 'Ediție limitată';

    public function createSession(Request $request)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9-]*$/i'],
            'items.*.option' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'context' => ['nullable', 'in:magazin,editie-limitata'],
            'promoCode' => ['nullable', 'string', 'max:64'],
            'orderData' => ['nullable', 'array'],
        ]);

        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            $promo = $this->resolvePromo($validated['promoCode'] ?? null);
            $discount = $promo ? (float) $promo->coupon->percent_off : 0.0;

            $lineItems = [];
            $subtotal = 0;
            $editieItemsOnly = true;

            foreach ($validated['items'] as $item) {
                $product = $this->findProduct($item['product_id']);
                $option = trim($item['option'] ?? '');

                $unitAmount = $product ? $this->unitAmountFor($product, $option) : null;
                if ($unitAmount === null) {
                    return response()->json(['error' => 'Unul dintre produsele din coș nu mai este disponibil.'], 422);
                }

                if ($product->category !== self::CATEGORY_EDITIE) {
                    $editieItemsOnly = false;
                }

                $subtotal += $unitAmount * $item['quantity'];

                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'ron',
                        'unit_amount' => $unitAmount,
                        'product_data' => [
                            'name' => $product->name,
                            'description' => $option !== '' ? $option : '-',
                            'metadata' => ['option' => $option],
                        ],
                    ],
                    'quantity' => $item['quantity'],
                ];
            }

            // the threshold follows the cart's contents, not a client-sent flag
            $threshold = $editieItemsOnly ? self::THRESHOLD_EDITIE : self::THRESHOLD_MAGAZIN;
            $discountedSubtotal = (int) round($subtotal * ((100 - $discount) / 100));
            $isPickup = ($validated['orderData']['deliveryType'] ?? null) === 'ridicare';
            $transportFee = ($isPickup || $discountedSubtotal >= $threshold) ? 0 : self::TRANSPORT_FEE;

            if ($transportFee > 0) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'ron',
                        'unit_amount' => $transportFee,
                        'product_data' => ['name' => 'Taxa de transport'],
                    ],
                    'quantity' => 1,
                ];
            }

            session([
                'order_data' => [
                    'formData' => $validated['orderData'] ?? [],
                    'items' => $validated['items'],
                    'discount' => $discount,
                    'total' => $discountedSubtotal + $transportFee,
                ],
            ]);

            $params = [
                'payment_method_types' => ['card'],
                'line_items' => $lineItems,
                'mode' => 'payment',
                'success_url' => url('/success').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => url('/cancel'),
            ];
            if ($promo) {
                // Stripe applies, validates and *consumes* the code: expiry,
                // max_redemptions, customer binding and minimum-amount rules
                // are enforced there, and times_redeemed is incremented
                $params['discounts'] = [['promotion_code' => $promo->id]];
            }

            $session = Session::create($params);

            return response()->json(['id' => $session->id]);
        } catch (\Exception $e) {
            Log::error('Stripe checkout error: '.$e->getMessage());

            return response()->json(['error' => 'Nu am putut porni plata. Te rugăm să încerci din nou.'], 500);
        }
    }

    public function validatePromo(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:64'],
        ]);

        try {
            Stripe::setApiKey(config('services.stripe.secret'));
            $promo = $this->resolvePromo($validated['code']);

            return $promo
                ? response()->json(['valid' => true, 'discount' => (float) $promo->coupon->percent_off])
                : response()->json(['valid' => false]);
        } catch (\Exception $e) {
            Log::error('Promo validation error: '.$e->getMessage());

            return response()->json(['valid' => false]);
        }
    }

    /** Cart items reference products by numeric id (storefront) or slug (legacy). */
    private function findProduct(string $key): ?Product
    {
        $query = Product::where('is_active', true);

        return ctype_digit($key)
            ? $query->find((int) $key)
            : $query->where('slug', $key)->first();
    }

    /**
     * An option containing "mușchi" selects the with-mușchi price when the
     * product has one; anything else pays the base price.
     */
    private function unitAmountFor(Product $product, string $option): ?int
    {
        // normalize s-comma/s-cedilla so "mușchi"/"muşchi"/"muschi" all match
        $optionLower = strtr(mb_strtolower($option), ['ș' => 's', 'ş' => 's']);
        $hasMuschi = str_contains($optionLower, 'muschi');

        $unit = ($hasMuschi && $product->price_with_muschi)
            ? $product->price_with_muschi
            : $product->price;

        return $unit > 0 ? $unit : null;
    }

    /** Resolve a promo code to its Stripe PromotionCode (null = invalid). */
    private function resolvePromo(?string $code): ?PromotionCode
    {
        $code = trim((string) $code);
        if ($code === '') {
            return null;
        }

        // Stripe's `code` filter is an exact, case-insensitive lookup
        $promotionCodes = PromotionCode::all(['active' => true, 'code' => $code, 'limit' => 1]);
        $promo = $promotionCodes->data[0] ?? null;

        return ($promo && $promo->coupon?->percent_off) ? $promo : null;
    }
}
