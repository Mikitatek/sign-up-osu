<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Services\RecaptchaVerifier;
use Illuminate\Http\Exceptions\HttpResponseException;
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

    /** Stripe's minimum is 30; the sweep in orders:confirm-payments relies on this bound. */
    public const SESSION_LIFETIME_MINUTES = 35;

    public function __construct(private RecaptchaVerifier $recaptcha) {}

    public function createSession(Request $request)
    {
        $validated = $this->validateOrder($request);

        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            $promo = $this->resolvePromo($validated['promoCode'] ?? null);
            $cart = $this->priceCart($validated, $promo);
            if ($cart === null) {
                return $this->productUnavailable();
            }

            $lineItems = array_map(fn (array $item) => [
                'price_data' => [
                    'currency' => 'ron',
                    'unit_amount' => $item['unit_amount'],
                    'product_data' => [
                        'name' => $item['name'],
                        'description' => $item['option'] !== '' ? $item['option'] : '-',
                        'metadata' => ['option' => $item['option']],
                    ],
                ],
                'quantity' => $item['quantity'],
            ], $cart['items']);

            if ($cart['transport_fee'] > 0) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'ron',
                        'unit_amount' => $cart['transport_fee'],
                        'product_data' => ['name' => 'Taxa de transport'],
                    ],
                    'quantity' => 1,
                ];
            }

            session([
                'order_data' => [
                    'formData' => $validated['orderData'],
                    'items' => $validated['items'],
                    'discount' => $cart['discount_percent'],
                    'total' => $cart['total'],
                ],
            ]);

            $params = [
                'payment_method_types' => ['card'],
                'line_items' => $lineItems,
                'mode' => 'payment',
                'expires_at' => now()->addMinutes(self::SESSION_LIFETIME_MINUTES)->timestamp,
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

            $this->createOrder($validated, $cart, [
                'status' => OrderStatus::PendingPayment,
                'payment_method' => 'card',
                'stripe_session_id' => $session->id,
            ]);

            return response()->json(['id' => $session->id]);
        } catch (\Exception $e) {
            Log::error('Stripe checkout error: '.$e->getMessage());

            return response()->json(['error' => 'Nu am putut porni plata. Te rugăm să încerci din nou.'], 500);
        }
    }

    /** A cash order needs no payment confirmation, so it is Placed right away. */
    public function placeCashOrder(Request $request)
    {
        $validated = $this->validateOrder($request);

        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            $cart = $this->priceCart($validated, $this->resolvePromo($validated['promoCode'] ?? null));
            if ($cart === null) {
                return $this->productUnavailable();
            }

            $order = $this->createOrder($validated, $cart, [
                'status' => OrderStatus::Placed,
                'payment_method' => 'cash',
                'placed_at' => now(),
            ]);

            $order->queueNotifications();

            return response()->json(['number' => $order->number]);
        } catch (\Exception $e) {
            Log::error('Cash order error: '.$e->getMessage());

            return response()->json(['error' => 'Nu am putut trimite comanda. Te rugăm să încerci din nou.'], 500);
        }
    }

    private function validateOrder(Request $request): array
    {
        $validated = $request->validate([
            'recaptchaToken' => ['nullable', 'string', 'max:4096'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9-]*$/i'],
            'items.*.option' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'context' => ['nullable', 'in:magazin,editie-limitata'],
            'promoCode' => ['nullable', 'string', 'max:64'],
            'orderData' => ['required', 'array'],
            'orderData.name' => ['required', 'string', 'max:255'],
            'orderData.phone' => ['required', 'string', 'max:32'],
            'orderData.email' => ['required', 'email', 'max:255'],
            'orderData.deliveryType' => ['required', 'in:livrare,ridicare'],
            'orderData.street' => ['required_if:orderData.deliveryType,livrare', 'nullable', 'string', 'max:255'],
            'orderData.city' => ['required_if:orderData.deliveryType,livrare', 'nullable', 'string', 'max:255'],
            'orderData.apartment' => ['nullable', 'string', 'max:50'],
            'orderData.staircase' => ['nullable', 'string', 'max:50'],
            'orderData.floor' => ['nullable', 'string', 'max:50'],
            'orderData.notes' => ['nullable', 'string', 'max:2000'],
            'orderData.scheduledDate' => ['nullable', 'string', 'max:20'],
            'orderData.scheduledTime' => ['nullable', 'string', 'max:50'],
        ]);

        // last, so a form mistake doesn't use up the single-use token
        if (! $this->recaptcha->passes($validated['recaptchaToken'] ?? null)) {
            throw new HttpResponseException(response()->json([
                'error' => 'Te rugăm să confirmi din nou că nu ești robot.',
            ], 422));
        }

        return $validated;
    }

    /**
     * Server-side totals for a validated cart; null when any item can no
     * longer be sold as requested.
     */
    private function priceCart(array $validated, ?PromotionCode $promo): ?array
    {
        $discount = $promo ? (float) $promo->coupon->percent_off : 0.0;

        $items = [];
        $subtotal = 0;
        $editieItemsOnly = true;

        foreach ($validated['items'] as $item) {
            $product = $this->findProduct($item['product_id']);
            $option = trim($item['option'] ?? '');

            if (! $product || ! $this->isSellableOption($product, $option)) {
                return null;
            }

            $unitAmount = $this->unitAmountFor($product, $option);
            if ($unitAmount === null) {
                return null;
            }

            if ($product->category !== self::CATEGORY_EDITIE) {
                $editieItemsOnly = false;
            }

            $subtotal += $unitAmount * $item['quantity'];

            $items[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'option' => $option,
                'quantity' => $item['quantity'],
                'unit_amount' => $unitAmount,
            ];
        }

        // the threshold follows the cart's contents, not a client-sent flag
        $threshold = $editieItemsOnly ? self::THRESHOLD_EDITIE : self::THRESHOLD_MAGAZIN;
        $discountedSubtotal = (int) round($subtotal * ((100 - $discount) / 100));
        $isPickup = $validated['orderData']['deliveryType'] === 'ridicare';
        $transportFee = ($isPickup || $discountedSubtotal >= $threshold) ? 0 : self::TRANSPORT_FEE;

        return [
            'items' => $items,
            'discount_percent' => $discount,
            'transport_fee' => $transportFee,
            'total' => $discountedSubtotal + $transportFee,
        ];
    }

    private function createOrder(array $validated, array $cart, array $attributes): Order
    {
        $form = $validated['orderData'];

        return Order::create([
            ...$attributes,
            'contact_name' => $form['name'],
            'contact_phone' => $form['phone'],
            'contact_email' => $form['email'],
            'delivery_type' => $form['deliveryType'],
            'street' => $form['street'] ?? null,
            'apartment' => $form['apartment'] ?? null,
            'staircase' => $form['staircase'] ?? null,
            'floor' => $form['floor'] ?? null,
            'city' => $form['city'] ?? null,
            'notes' => $form['notes'] ?? null,
            'scheduled_date' => $form['scheduledDate'] ?? null,
            'scheduled_time' => $form['scheduledTime'] ?? null,
            'items' => $cart['items'],
            'discount_percent' => $cart['discount_percent'],
            'transport_fee' => $cart['transport_fee'],
            'total' => $cart['total'],
        ]);
    }

    private function productUnavailable()
    {
        return response()->json(['error' => 'Unul dintre produsele din coș nu mai este disponibil.'], 422);
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
     * The storefront sends the chosen options joined with ", ". Each one must
     * be a real option of this product, otherwise a tampered label could
     * drop the price an extra carries.
     */
    private function isSellableOption(Product $product, string $option): bool
    {
        if ($option === '' || $option === '-') {
            return true;
        }

        $offered = array_unique([...($product->options ?? []), ...($product->one_option ?? [])]);
        $chosen = array_filter($offered, fn ($label) => str_contains(", {$option}, ", ", {$label}, "));

        return mb_strlen(implode(', ', $chosen)) === mb_strlen($option);
    }

    /**
     * Mirrors the storefront: an option priced in its label ("extra mușchi
     * (4 lei)") adds that amount, and a bare option containing "mușchi"
     * selects the with-mușchi price when the product has one.
     */
    private function unitAmountFor(Product $product, string $option): ?int
    {
        $extras = 0;
        $hasMuschi = false;

        foreach (explode(', ', $option) as $label) {
            $price = $this->optionPrice($label);
            $extras += $price;

            // normalize s-comma/s-cedilla so "mușchi"/"muşchi"/"muschi" all match
            $normalized = strtr(mb_strtolower($label), ['ș' => 's', 'ş' => 's']);
            $hasMuschi = $hasMuschi || ($price === 0 && str_contains($normalized, 'muschi'));
        }

        $unit = ($hasMuschi && $product->price_with_muschi)
            ? $product->price_with_muschi
            : $product->price;

        return $unit > 0 ? $unit + $extras : null;
    }

    /** The price in bani carried by an option label, 0 when it has none. */
    private function optionPrice(string $label): int
    {
        $patterns = [
            '/\(\s*\+?\s*(\d+(?:[.,]\d+)?)\s*(?:lei|ron)?\s*\)\s*$/iu',
            '/[+]\s*(\d+(?:[.,]\d+)?)\s*(?:lei|ron)?\s*$/iu',
            '/(\d+(?:[.,]\d+)?)\s*(?:lei|ron)\s*$/iu',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, trim($label), $match)) {
                return (int) round((float) str_replace(',', '.', $match[1]) * 100);
            }
        }

        return 0;
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
