// resources/js/Pages/CozonaciPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import emailjs from "@emailjs/browser";
import ReCAPTCHA from "react-google-recaptcha";
import SiteLayout from "@/Layouts/SiteLayout";

export default function EditieLimitata() {
    // ----- CONFIG: Limited edition cozonaci 2025 -----
    const COZONAC_PRODUCTS = [
        {
            id: "cozonac-ciocolata-merisoare-2025",
            name: "Cozonac Artizanal Ciocolată cu Merișoare Învelit în Ciocolată Duo",
            description:
                "Ingrediente: făină, sare, zahăr, ouă, lapte, grăsimi vegetale, drojdie, arome de vanilie, rom și lămâie, ciocolată cu lapte amăruie, ciocolată albă, cremă de ciocolată, merișoare.",
            image: "/img/cozcioco.png",
            basePrice: 3990,
            options: [],
            weights: [{ label: "750 g", key: "750g", priceDelta: 0 }],
            tags: ["Ediție Limitată", "Artizanal", "Sărbători"],
            gramaj: "750 g",
        },
        {
            id: "cozonac-nuca-ciocolata-2025",
            name: "Cozonac Artizanal Nucă Învelit în Ciocolată",
            description:
                "Ingrediente: făină, sare, zahăr, ouă, lapte, grăsimi vegetale, drojdie, arome de vanilie, nucă, rom și lămâie, ciocolată cu lapte amăruie, nucă, cacao, soia.",
            image: "/img/coznuca.png",
            basePrice: 3990,
            options: [],
            weights: [{ label: "750 g", key: "750g", priceDelta: 0 }],
            tags: ["Ediție Limitată", "Artizanal", "Sărbători"],
            gramaj: "750 g",
        },
        {
            id: "cozonac-zmeura-alba-2025",
            name: "Cozonac Artizanal Zmeură Învelit în Ciocolată Albă",
            description:
                "Ingrediente: făină, sare, zahăr, ouă, lapte, grăsimi vegetale, drojdie, arome de vanilie, rom și lămâie, ciocolată albă, umplutură de zmeură, zmeură confiată.",
            image: "/img/cozzmeura.png",
            basePrice: 3990,
            options: [],
            weights: [{ label: "750 g", key: "750g", priceDelta: 0 }],
            tags: ["Ediție Limitată", "Artizanal", "Sărbători"],
            gramaj: "750 g",
        },
    ];

    // ----- BUNDLE (3x cozonaci – one of each) WITH DISCOUNT -----
    const BUNDLE_PRODUCT = {
        id: "cozonac-bundle-3x-2025",
        name: "Pachet Cozonaci: 3 Bucăți (una din fiecare)",
        description:
            "Pachet special cu 3 cozonaci artizanali (750 g fiecare): Ciocolată cu merișoare, Nucă învelit în ciocolată și Zmeură în ciocolată albă.",
        image: "/img/cozbundle.png", // set a collage/fallback image
        basePrice: 9990, // 99.90 RON (discounted, charged at checkout)
        originalPrice: 11700, // 117.00 RON (for UI strike-through)
        options: [], // no variant selection for the bundle
        weights: [{ label: "3 × 750 g", key: "3x750g", priceDelta: 0 }],
        tags: ["Pachet", "Ediție Limitată"],
        gramaj: "3 × 750 g",
    };

    // ----- Cart is separate for Cozonaci -----
    const CART_KEY = "osu_cart_cozonaci";

    // ----- Global state (same look & feel) -----
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [orderSuccessMessage, setOrderSuccessMessage] = useState("");
    const cartRef = useRef(null);

    const [promoCode, setPromoCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [promoStatus, setPromoStatus] = useState("");

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedWeight, setSelectedWeight] = useState(null);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        deliveryType: "livrare",
        street: "",
        apartment: "",
        staircase: "",
        floor: "",
        city: "",
        paymentMethod: "card",
        notes: "",
        scheduledDate: "",
        scheduledHour: "asap",
    });

    const [formErrors, setFormErrors] = useState({});
    const [captchaVerified, setCaptchaVerified] = useState(false);

    const form = useRef();

    // ----- Working hours (mirrors shop) -----
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isAfterOpening =
        currentHour > 10 || (currentHour === 10 && currentMinute >= 0);
    const isBeforeClosing =
        currentHour < 21 || (currentHour === 21 && currentMinute <= 30);
    const isWorkingHours = isAfterOpening && isBeforeClosing;
    // Ignore schedule in UI message for this page:
    const workingMessage = true;

    // --- Date limits: only 2+ days ahead, until 24 Dec of current year ---
    const today = new Date();

    const formatDate = (d) => d.toISOString().split("T")[0];

    // earliest date = today + 2 days
    const minOrderDateObj = new Date(today);
    minOrderDateObj.setDate(minOrderDateObj.getDate() + 2);

    // latest date = 24 Dec (current year)
    const currentYear = today.getFullYear();
    const maxOrderDateObj = new Date(`${currentYear}-12-24T23:59:59`);

    const minOrderDate = formatDate(minOrderDateObj);
    const maxOrderDate = formatDate(maxOrderDateObj);

    const phoneRegex = /^07\d{8}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isPhoneValid = phoneRegex.test(formData.phone);
    const isEmailValid = emailRegex.test(formData.email);

    // ----- Stripe -----
    const stripePromise = loadStripe(
        "pk_live_51RWwVcGrsyEky6rcB0YtwifR8JwxQenPKJx1YS0iYlsZTGJiywebGqnJlZdBl1c9f1j5FD48FGLx974zydC2fUjc00WYdqKaNi"
    );

    // ----- LocalStorage (separate) -----
    useEffect(() => {
        const saved = localStorage.getItem(CART_KEY);
        if (saved) setCartItems(JSON.parse(saved));
    }, []);
    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    }, [cartItems]);

    // ----- Modal scroll lock -----
    useEffect(() => {
        const shouldBlock = selectedProduct !== null || isCartOpen;
        document.body.style.overflow = shouldBlock ? "hidden" : "auto";
        return () => (document.body.style.overflow = "auto");
    }, [selectedProduct, isCartOpen]);

    // Close cart on outside click
    useEffect(() => {
        if (!isCartOpen) return;
        function handleClickOutside(e) {
            if (cartRef.current && !cartRef.current.contains(e.target))
                closeCart();
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [isCartOpen]);

    // ----- Helpers -----
    const getVariantData = () => {
        if (!selectedProduct?.options?.length) return null;
        return (
            selectedProduct.options.find((o) => o.key === selectedVariant) ||
            null
        );
    };
    const getWeightData = () => {
        return (
            selectedProduct?.weights?.find((w) => w.key === selectedWeight) ||
            null
        );
    };
    const getEffectivePrice = () => {
        if (!selectedProduct) return 0;
        const variant = getVariantData();
        const weight = getWeightData();
        const base = variant ? variant.price : selectedProduct.basePrice;
        const delta = weight ? weight.priceDelta : 0;
        return base + delta;
    };

    const openModal = (product) => {
        setSelectedProduct(product);
        setIsAnimatingOut(false);
        setSelectedVariant(product.options?.[0]?.key ?? null);
        setSelectedWeight(product.weights?.[0]?.key ?? null);
    };
    const closeModal = () => {
        setSelectedProduct(null);
        setSelectedVariant(null);
        setSelectedWeight(null);
    };
    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => closeModal(), 300);
    };

    const addToCart = () => {
        if (!selectedProduct) return;
        const variant = getVariantData();
        const weight = getWeightData();

        const parts = [];
        if (variant?.label) parts.push(variant.label);
        if (weight?.label) parts.push(weight.label);
        const optionDesc = parts.join(", ");

        const price = getEffectivePrice();
        const cartKey = `${selectedProduct.id}-${selectedVariant || "novar"}-${
            selectedWeight || "now"
        }`;

        setCartItems((prev) => {
            const existing = prev.find((i) => i.cartKey === cartKey);
            if (existing) {
                return prev.map((i) =>
                    i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    image: selectedProduct.image,
                    option: optionDesc,
                    cartKey,
                    qty: 1,
                    price,
                },
            ];
        });
        handleClose();
    };

    const openCart = () => {
        setShowCart(true);
        setTimeout(() => setIsCartOpen(true), 10);
    };
    const closeCart = () => {
        setIsCartOpen(false);
        setTimeout(() => setShowCart(false), 300);
    };

    const updateQuantity = (cartKey, delta) => {
        setCartItems((prev) =>
            prev
                .map((i) =>
                    i.cartKey === cartKey ? { ...i, qty: i.qty + delta } : i
                )
                .filter((i) => i.qty > 0)
        );
    };

    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const isPickup = formData.deliveryType === "ridicare";
    const discountedSubtotal = subtotal * ((100 - discount) / 100);
    const transportFee = isPickup ? 0 : discountedSubtotal >= 6000 ? 0 : 1800;
    const total = discountedSubtotal + transportFee;

    const applyPromoCode = async () => {
        try {
            const res = await fetch("/validate-promo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                },
                body: JSON.stringify({ code: promoCode }),
            });
            const data = await res.json();
            if (data.valid) {
                setDiscount(data.discount);
                setPromoStatus(`Cod valid: -${data.discount}%`);
            } else {
                setDiscount(0);
                setPromoStatus("Cod invalid");
            }
        } catch {
            setPromoStatus("Eroare la validare cod");
        }
    };

    // ----- Checkout (same flow) -----
    const handleCheckout = async () => {
        if (
            !formData.name ||
            !formData.phone ||
            !formData.email ||
            !formData.deliveryType ||
            !formData.paymentMethod ||
            (formData.deliveryType === "livrare" &&
                (!formData.street || !formData.city))
        ) {
            setFormErrors({
                general: "Te rugăm să completezi toate câmpurile obligatorii.",
            });
            return;
        }
        if (!captchaVerified) {
            setFormErrors({
                general: "Te rugăm să confirmi că nu ești robot.",
            });
            return;
        }
        if (formData.scheduledHour !== "asap" && !formData.scheduledDate) {
            setFormErrors({
                general: "Te rugăm să selectezi o dată pentru livrare.",
            });
            return;
        }

        // Validate selected date is between minOrderDate and maxOrderDate
        if (formData.scheduledDate) {
            const selectedDate = new Date(formData.scheduledDate);
            const minDate = new Date(minOrderDate);
            const maxDate = new Date(maxOrderDate);

            if (selectedDate < minDate || selectedDate > maxDate) {
                setFormErrors({
                    general:
                        `Poți programa livrarea doar începând cu ` +
                        `${minOrderDate.split("-").reverse().join(".")} ` +
                        `și până la ${maxOrderDate
                            .split("-")
                            .reverse()
                            .join(".")}.`,
                });
                return;
            }
        }

        if (formData.paymentMethod === "cash") {
            sendOrderEmail();
            return;
        }

        try {
            const transportItem =
                transportFee > 0
                    ? {
                          name: "Taxa de transport",
                          option: "-",
                          price: transportFee,
                          quantity: 1,
                      }
                    : null;

            const response = await fetch("/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                },
                body: JSON.stringify({
                    items: [
                        ...cartItems.map((item) => ({
                            name: item.name,
                            option: item.option || "-",
                            price: item.price,
                            quantity: item.qty,
                        })),
                        ...(transportItem ? [transportItem] : []),
                    ],
                    promoCode: promoCode.trim(),
                    orderData: formData,
                    discount,
                    total,
                }),
            });

            localStorage.setItem(
                "osu_order_data",
                JSON.stringify({ formData, items: cartItems, discount, total })
            );

            const session = await response.json();
            if (session.id) {
                const stripe = await stripePromise;
                stripe.redirectToCheckout({ sessionId: session.id });
            }
        } catch (error) {
            console.error("Checkout error:", error);
        }
    };

    // ----- Email (cash) -----
    const sendOrderEmail = () => {
        const emailData = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            deliveryType: formData.deliveryType,
            paymentMethod: formData.paymentMethod,
            street: formData.street,
            apartment: formData.apartment,
            staircase: formData.staircase,
            floor: formData.floor,
            city: formData.city,
            notes: formData.notes,
            scheduledDate: formData.scheduledDate || "Azi",
            scheduledTime: formData.scheduledHour || "La orice oră",
            items: cartItems
                .map((item) => {
                    const originalTotal = (item.qty * item.price) / 100;
                    const discountedTotal =
                        originalTotal * ((100 - discount) / 100);
                    return discount > 0
                        ? `${item.name} (${item.option}) x ${
                              item.qty
                          } = ${discountedTotal.toFixed(
                              2
                          )} RON (redus din ${originalTotal.toFixed(
                              2
                          )} RON, -${discount}%)`
                        : `${item.name} (${item.option}) x ${
                              item.qty
                          } = ${originalTotal.toFixed(2)} RON`;
                })
                .join("\n"),
            total: (total / 100).toFixed(2),
        };

        emailjs
            .send(
                "service_p8d703k",
                "template_x3q7wos",
                emailData,
                "BGDnmfh9gasmMLC2U"
            )
            .then(() => {
                setOrderSuccessMessage("✅ Comanda a fost trimisă cu succes!");
                localStorage.removeItem(CART_KEY);
                closeCart();
                setTimeout(() => {
                    setOrderSuccessMessage("");
                    window.location.reload();
                }, 4000);
            })
            .catch((error) => console.error("EmailJS error:", error));
    };

    // ----- Time options -----
    function generateTimeOptions(startHour, endHour, stepMinutes) {
        const options = [];
        for (let h = startHour; h <= endHour; h++) {
            options.push(`${h.toString().padStart(2, "0")}:00`);
            if (stepMinutes === 30 && h < endHour)
                options.push(`${h.toString().padStart(2, "0")}:30`);
        }
        return options;
    }
    function generateTimeOptionsDynamic(selectedDate) {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        if (selectedDate === todayStr) {
            const nextHour = now.getHours() + 2;
            const startHour = Math.min(Math.max(nextHour, 10), 21);
            return generateTimeOptions(startHour, 21, 30);
        }
        return generateTimeOptions(10, 21, 30);
    }

    const totalItemCount = cartItems.reduce((s, i) => s + i.qty, 0);

    return (
        <SiteLayout
            totalItemCount={totalItemCount}
            subtotal={subtotal}
            setIsCartOpen={openCart}
        >
            <main className="max-w-6xl mx-auto py-10 md:px-6 pt-[120px] md:pt-[130px]">
                {/* Hero banner */}
                <div className="max-w-6xl mx-auto px-4 md:px-0">
                    <div className="relative overflow-hidden rounded-2xl group w-full select-none touch-pan-y">
                        <a href="#cozonac" className="block relative w-full">
                            <div className="relative w-full h-[58vw] sm:h-[48vw] md:h-[420px] lg:h-[480px]">
                                <img
                                    src="/img/cozonaci.jpeg"
                                    alt="Cozonac de Crăciun – Ediție Limitată"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-3 sm:px-4">
                                    <span className="inline-block bg-red-600/90 text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-3">
                                        EDIȚIE LIMITATĂ
                                    </span>
                                    <h1 className="text-lg sm:text-2xl md:text-4xl font-bold mb-2 drop-shadow">
                                        Cozonaci Artizanali de Crăciun
                                    </h1>
                                    <p className="text-xs sm:text-sm md:text-base opacity-95">
                                        Trei rețete speciale • 750 g • Umpluturi
                                        generoase
                                    </p>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>

                <div>
                    <h1 className="text-sm md:text-md text-center mt-6 px-4 md:px-0">
                        Livrare în: Brașov, Ghimbav, Cristian, Sânpetru, Stupini
                        și Hărman
                    </h1>
                </div>

                {/* Delivery badges */}
                <div className="grid grid-cols-2 divide-x divide-gray-300 mt-6 text-center font-bold text-gray-400 px-4 md:px-0">
                    <div className="flex flex-col items-center justify-center text-sm">
                        <span className="text-lg text-black">18.00 RON</span>
                        <span className="text-xs">livrare</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-sm">
                        <span className="text-lg text-black">între 2 - 24</span>
                        <span className="text-xs">zile</span>
                    </div>
                </div>

                {/* --- BUNDLE CARD (full width, first) --- */}
                <section id="cozonac" className="mt-10 px-4 md:px-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                        Cozonac – Alege varianta
                    </h2>

                    <div
                        className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-lg shadow-md md:shadow-none hover:shadow-md transition overflow-hidden mb-8"
                        onClick={() => openModal(BUNDLE_PRODUCT)}
                    >
                        {/* Image */}
                        <div className="w-full md:w-72 relative">
                            <img
                                src={BUNDLE_PRODUCT.image}
                                alt={BUNDLE_PRODUCT.name}
                                loading="lazy"
                                className="w-full h-48 md:h-full object-cover"
                            />
                            <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                                Pachet 3x
                            </span>
                        </div>

                        {/* Text */}
                        <div className="flex-1 p-4 md:p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-block bg-emerald-700 text-white text-xs font-bold px-2 py-1 rounded">
                                    PACHET
                                </span>
                                <span className="inline-block bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                                    3 × 750 g
                                </span>
                                {BUNDLE_PRODUCT.originalPrice && (
                                    <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                                        DISCOUNT
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold mb-1">
                                {BUNDLE_PRODUCT.name}
                            </h3>
                            <p className="text-gray-600 text-sm italic mb-2">
                                {BUNDLE_PRODUCT.description}
                            </p>
                            <p className="text-gray-600 text-sm italic mb-2">
                                {BUNDLE_PRODUCT.gramaj}
                            </p>

                            {/* Discounted price display */}
                            <div className="mt-3 flex items-baseline gap-2">
                                {BUNDLE_PRODUCT.originalPrice && (
                                    <span className="text-gray-500 line-through">
                                        {(
                                            BUNDLE_PRODUCT.originalPrice / 100
                                        ).toFixed(2)}{" "}
                                        RON
                                    </span>
                                )}
                                <span className="text-2xl font-extrabold text-red-600">
                                    {(BUNDLE_PRODUCT.basePrice / 100).toFixed(
                                        2
                                    )}{" "}
                                    RON
                                </span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openModal(BUNDLE_PRODUCT);
                                }}
                                className="mt-4 bg-emerald-800 text-white px-5 py-2 text-sm rounded font-bold hover:bg-red-500"
                            >
                                Alege pachetul
                            </button>
                        </div>
                    </div>

                    {/* --- SINGLE PRODUCTS (3 columns) --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {COZONAC_PRODUCTS.map((p) => (
                            <div
                                key={p.id}
                                className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-md md:shadow-none hover:shadow-md transition overflow-hidden"
                                onClick={() => openModal(p)}
                            >
                                <div className="relative w-full h-48">
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        loading="lazy"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded">
                                        Limited
                                    </span>
                                </div>

                                <div className="flex-1 p-4 md:p-5 flex flex-col">
                                    <h3 className="text-lg font-bold mb-1">
                                        {p.name}
                                    </h3>
                                    <p className="text-gray-600 text-sm italic mb-2 line-clamp-3">
                                        {p.description}
                                    </p>
                                    <p className="text-gray-600 text-sm italic mb-3">
                                        {p.gramaj}
                                    </p>

                                    <div className="mt-auto">
                                        <span className="text-2xl font-bold">
                                            {(p.basePrice / 100).toFixed(2)} RON
                                        </span>
                                        <span className="text-gray-500 text-sm ml-2">
                                            de la
                                        </span>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openModal(p);
                                            }}
                                            className="mt-3 bg-emerald-800 text-white px-5 py-2 text-sm rounded font-bold hover:bg-red-500"
                                        >
                                            Adauga în coș
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Modal */}
            {selectedProduct && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={handleClose}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-white p-6 rounded-lg shadow-xl max-w-md w-full relative transform transition duration-300 ease-out ${
                            isAnimatingOut
                                ? "animate-fadeOut"
                                : "animate-fadeIn"
                        }`}
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
                        >
                            &times;
                        </button>

                        <img
                            src={selectedProduct.image}
                            alt={selectedProduct.name}
                            loading="lazy"
                            className="w-full h-48 object-cover rounded mb-4"
                        />

                        <h3 className="text-2xl font-bold mb-2">
                            {selectedProduct.name}
                        </h3>
                        <p className="text-gray-700 text-sm mb-4">
                            {selectedProduct.description}
                        </p>

                        {/* Variants (only if present) */}
                        {selectedProduct.options?.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-1">
                                    Umplutură
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {selectedProduct.options.map((opt) => (
                                        <label
                                            key={opt.key}
                                            className="flex items-center gap-2"
                                        >
                                            <input
                                                type="radio"
                                                name="cozonac_variant"
                                                checked={
                                                    selectedVariant === opt.key
                                                }
                                                onChange={() =>
                                                    setSelectedVariant(opt.key)
                                                }
                                            />
                                            <span className="text-sm">
                                                {opt.label}
                                            </span>
                                            <span className="ml-auto text-sm text-gray-700 font-medium">
                                                {(opt.price / 100).toFixed(2)}{" "}
                                                RON
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Weights */}
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-1">
                                Greutate
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {selectedProduct.weights?.map((w) => (
                                    <label
                                        key={w.key}
                                        className="flex items-center gap-2"
                                    >
                                        <input
                                            type="radio"
                                            name="cozonac_weight"
                                            checked={selectedWeight === w.key}
                                            onChange={() =>
                                                setSelectedWeight(w.key)
                                            }
                                        />
                                        <span className="text-sm">
                                            {w.label}
                                        </span>
                                        {w.priceDelta !== 0 && (
                                            <span className="ml-auto text-xs text-gray-600">
                                                {w.priceDelta > 0 ? "+" : ""}
                                                {(w.priceDelta / 100).toFixed(
                                                    2
                                                )}{" "}
                                                RON
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Price: show original (if any) + discounted in red */}
                        <p className="text-lg font-semibold mb-4 flex items-baseline gap-2">
                            {selectedProduct?.originalPrice && (
                                <span className="text-gray-500 line-through">
                                    {(
                                        selectedProduct.originalPrice / 100
                                    ).toFixed(2)}{" "}
                                    RON
                                </span>
                            )}
                            <span className="text-2xl font-extrabold text-red-600">
                                {(getEffectivePrice() / 100).toFixed(2)} RON
                            </span>
                        </p>

                        <button
                            onClick={addToCart}
                            className="w-full bg-emerald-800 text-white py-2 rounded hover:bg-red-500 font-bold"
                        >
                            Adaugă în coș
                        </button>
                    </div>
                </div>
            )}

            {/* Success toast */}
            {orderSuccessMessage && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white text-emerald-800 text-xl font-bold px-6 py-4 rounded-lg shadow-xl text-center max-w-md w-full">
                        {orderSuccessMessage}
                    </div>
                </div>
            )}

            {/* Cart modal */}
            <CartModal
                isOpen={isCartOpen}
                showCart={showCart}
                closeCart={closeCart}
                cartRef={cartRef}
                cartItems={cartItems}
                updateQuantity={updateQuantity}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                applyPromoCode={applyPromoCode}
                promoStatus={promoStatus}
                discount={discount}
                subtotal={subtotal}
                isWorkingHours={isWorkingHours}
                workingMessage={workingMessage}
                total={total}
                transportFee={transportFee}
                formData={formData}
                setFormData={setFormData}
                isPhoneValid={isPhoneValid}
                isEmailValid={isEmailValid}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
                captchaVerified={captchaVerified}
                setCaptchaVerified={setCaptchaVerified}
                minOrderDate={minOrderDate}
                maxOrderDate={maxOrderDate}
                generateTimeOptionsDynamic={generateTimeOptionsDynamic}
                handleCheckout={handleCheckout}
                form={form}
            />
        </SiteLayout>
    );
}

/* ---------------- Cart Modal Component (reused styling) ---------------- */
function CartModal({
    isOpen,
    showCart,
    closeCart,
    cartRef,
    cartItems,
    updateQuantity,
    promoCode,
    setPromoCode,
    applyPromoCode,
    promoStatus,
    discount,
    subtotal,
    isWorkingHours,
    workingMessage,
    total,
    transportFee,
    formData,
    setFormData,
    isPhoneValid,
    isEmailValid,
    formErrors,
    setFormErrors,
    captchaVerified,
    setCaptchaVerified,
    minOrderDate,
    maxOrderDate,
    generateTimeOptionsDynamic,
    handleCheckout,
    form,
}) {
    return (
        showCart && (
            <div
                className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${
                    isOpen ? "opacity-100" : "opacity-0"
                }`}
            >
                <div
                    className={`bg-white rounded-lg shadow-xl transform transition-all duration-300 ${
                        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
                    }`}
                >
                    <div
                        className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full relative overflow-y-auto max-h-[90vh] sm:max-h-screen"
                        ref={cartRef}
                    >
                        <button
                            onClick={() => closeCart()}
                            className="absolute top-2 right-2 text-gray-500 hover:text-black text-3xl w-10 h-10 flex items-center justify-center"
                        >
                            ×
                        </button>
                        <h3 className="text-2xl font-bold mb-4">
                            Coș de cumpărături
                        </h3>
                        {cartItems.length === 0 ? (
                            <p className="text-gray-600">Coșul este gol.</p>
                        ) : (
                            <>
                                <ul className="mb-4">
                                    {cartItems.map((item) => {
                                        const fullPrice =
                                            (item.price * item.qty) / 100;
                                        const discountedPrice =
                                            fullPrice *
                                            ((100 - discount) / 100);
                                        return (
                                            <li
                                                key={item.cartKey}
                                                className="flex justify-between items-center mb-2"
                                            >
                                                <div>
                                                    <div>
                                                        {item.name}{" "}
                                                        {item.option &&
                                                            `(${item.option})`}
                                                    </div>
                                                    <div className="text-sm text-gray-600 placeholder-italic">
                                                        {discount > 0 ? (
                                                            <>
                                                                <span className="line-through mr-2">
                                                                    {fullPrice.toFixed(
                                                                        2
                                                                    )}{" "}
                                                                    RON
                                                                </span>
                                                                <span className="text-green-600 font-semibold">
                                                                    {discountedPrice.toFixed(
                                                                        2
                                                                    )}{" "}
                                                                    RON
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span>
                                                                {fullPrice.toFixed(
                                                                    2
                                                                )}{" "}
                                                                RON
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.cartKey,
                                                                -1
                                                            )
                                                        }
                                                        className="px-2 py-1 bg-gray-200 rounded"
                                                    >
                                                        -
                                                    </button>
                                                    <span>{item.qty}</span>
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.cartKey,
                                                                1
                                                            )
                                                        }
                                                        className="px-2 py-1 bg-gray-200 rounded"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                        {/* Promo code */}
                        {/* <div className="mb-4">
                            <label
                                htmlFor="promo"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Cod promoțional:
                            </label>
                            <div className="flex flex-col sm:flex-row sm:space-x-2 mt-1 space-y-2 sm:space-y-0">
                                <input
                                    type="text"
                                    id="promo"
                                    value={promoCode}
                                    onChange={(e) =>
                                        setPromoCode(e.target.value)
                                    }
                                    className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-2 placeholder-italic"
                                />
                                <button
                                    onClick={applyPromoCode}
                                    className="w-full sm:w-auto px-4 py-2 bg-emerald-800 text-white rounded hover:bg-red-500 font-bold"
                                >
                                    Aplică
                                </button>
                            </div>
                            {promoStatus && (
                                <p className="text-sm mt-1 text-gray-600">
                                    {promoStatus}
                                </p>
                            )}
                        </div> */}
                        {/* Totals */}
                        <p className="text-lg font-semibold mt-4">
                            Subtotal:{" "}
                            {discount > 0 ? (
                                <>
                                    <span className="line-through mr-2">
                                        {(subtotal / 100).toFixed(2)} RON
                                    </span>
                                    <span>
                                        {(
                                            (subtotal *
                                                ((100 - discount) / 100)) /
                                            100
                                        ).toFixed(2)}{" "}
                                        RON
                                    </span>
                                </>
                            ) : (
                                <span>{(subtotal / 100).toFixed(2)} RON</span>
                            )}
                        </p>
                        <p className="text-sm text-gray-700 my-2 italic">
                            {formData.deliveryType === "ridicare"
                                ? "Ridicare personală – fără cost transport"
                                : transportFee > 0
                                ? `+ Transport: ${(transportFee / 100).toFixed(
                                      2
                                  )} RON (gratuit peste 60 RON)`
                                : "Transport gratuit (comenzi peste 60 RON)"}
                        </p>
                        <p className="text-lg font-semibold mb-4">
                            Total: <span>{(total / 100).toFixed(2)} RON</span>
                        </p>
                        <textarea
                            className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-4 placeholder-italic"
                            placeholder="Mențiuni/Observații (opțional)"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    notes: e.target.value,
                                })
                            }
                        ></textarea>
                        {/* Delivery details */}
                        <h3 className="text-2xl font-bold my-4">
                            Detalii de livrare
                        </h3>
                        <input
                            required
                            className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-2 placeholder-italic"
                            type="text"
                            placeholder="Nume și prenume *"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    name: e.target.value,
                                })
                            }
                        />
                        <input
                            required
                            className={`w-full border ${
                                !isPhoneValid && formData.phone
                                    ? "border-red-500"
                                    : "border-gray-300"
                            } rounded-md shadow-sm px-3 py-2 mb-1 placeholder-italic`}
                            type="tel"
                            placeholder="Telefon *"
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    phone: e.target.value,
                                })
                            }
                        />
                        {!isPhoneValid && formData.phone && (
                            <p className="text-red-600 text-sm mb-2">
                                Număr invalid. Ex.: 07XXXXXXXX
                            </p>
                        )}
                        <input
                            required
                            className={`w-full border ${
                                !isEmailValid && formData.email
                                    ? "border-red-500"
                                    : "border-gray-300"
                            } rounded-md shadow-sm px-3 py-2 mb-1 placeholder-italic`}
                            type="email"
                            placeholder="Email *"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    email: e.target.value,
                                })
                            }
                        />
                        {!isEmailValid && formData.email && (
                            <p className="text-red-600 text-sm mb-2">
                                Adresa de email nu este validă.
                            </p>
                        )}
                        <h5 className="text-2xl font-bold my-4">Livrare</h5>
                        <>
                            <input
                                required
                                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-2 placeholder-italic"
                                type="text"
                                placeholder="Stradă *"
                                value={formData.street}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        street: e.target.value,
                                    })
                                }
                            />
                            <div className="flex gap-2">
                                <input
                                    className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-2 placeholder-italic"
                                    type="text"
                                    placeholder="Apartament (opțional)"
                                    value={formData.apartment}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            apartment: e.target.value,
                                        })
                                    }
                                />
                                <input
                                    className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-2 placeholder-italic"
                                    type="text"
                                    placeholder="Scară (opțional)"
                                    value={formData.staircase}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            staircase: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-2 placeholder-italic"
                                    type="text"
                                    placeholder="Etaj (opțional)"
                                    value={formData.floor}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            floor: e.target.value,
                                        })
                                    }
                                />
                                <select
                                    required
                                    className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-2 placeholder-italic"
                                    value={formData.city}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            city: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Localitate *</option>
                                    {[
                                        "Brașov",
                                        "Hărman",
                                        "Ghimbav",
                                        "Cristian",
                                        "Sânpetru",
                                        "Stupini",
                                    ].map((city) => (
                                        <option key={city} value={city}>
                                            {city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Livrare programată
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 placeholder-italic"
                                    value={
                                        formData.scheduledDate || minOrderDate
                                    }
                                    min={minOrderDate}
                                    max={maxOrderDate}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scheduledDate: e.target.value,
                                            scheduledHour: "asap",
                                        })
                                    }
                                />

                                <select
                                    className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 placeholder-italic"
                                    value={formData.scheduledHour || "asap"}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scheduledHour: e.target.value,
                                        })
                                    }
                                >
                                    <option value="asap">La orice oră</option>
                                    {generateTimeOptionsDynamic(
                                        formData.scheduledDate || minOrderDate
                                    ).map((hour) => (
                                        <option key={hour} value={hour}>
                                            {hour}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <h5 className="text-2xl font-bold my-4">
                            Metoda de plată
                        </h5>
                        <select
                            required
                            className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-4 placeholder-italic"
                            value={formData.paymentMethod}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    paymentMethod: e.target.value,
                                })
                            }
                        >
                            <option value="card">Plata cu cardul</option>
                        </select>
                        <p className="mb-4">
                            Pentru plățile cu cash, comanda trebuie plasată la
                            locația fizică.
                        </p>
                        {formErrors.general && (
                            <p className="text-red-600 text-sm mb-2">
                                {formErrors.general}
                            </p>
                        )}
                        <div
                            className="mb-4"
                            style={{
                                transform: "scale(0.85)",
                                transformOrigin: "0 0",
                            }}
                        >
                            <ReCAPTCHA
                                sitekey="6LeqX14rAAAAAI4xzmtc7bylyMAbvVwDPJvSBi2l"
                                onChange={() => setCaptchaVerified(true)}
                            />
                        </div>
                        {!isWorkingHours && (
                            <p className="text-red-600 font-semibold text-center mb-2">
                                {workingMessage}
                            </p>
                        )}
                        {cartItems.length === 0 && (
                            <p className="text-red-600 text-sm font-semibold mb-2">
                                Coșul este gol. Adaugă produse pentru a putea
                                plasa comanda.
                            </p>
                        )}
                        <button
                            onClick={handleCheckout}
                            disabled={
                                !isWorkingHours ||
                                cartItems.length === 0 ||
                                !isPhoneValid ||
                                !isEmailValid
                            }
                            className={`w-full mt-4 py-2 rounded font-bold transition ${
                                !isWorkingHours || cartItems.length === 0
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-emerald-800 text-white hover:bg-red-500"
                            }`}
                        >
                            Trimite comanda
                        </button>
                    </div>
                </div>
            </div>
        )
    );
}
