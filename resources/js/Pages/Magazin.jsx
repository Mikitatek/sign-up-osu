import React, { useEffect, useState, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import emailjs from "@emailjs/browser";
import ReCAPTCHA from "react-google-recaptcha";
import SiteLayout from "@/Layouts/SiteLayout";

export default function ShopPage() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderSuccessMessage, setOrderSuccessMessage] = useState("");

    //pt animatii
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const cartRef = useRef(null);
    const [promoCode, setPromoCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [promoStatus, setPromoStatus] = useState("");
    const [contactStatus, setContactStatus] = useState({
        message: "",
        success: null,
    });
    const [dateError, setDateError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        deliveryType: "livrare", // implicit "livrare"
        street: "",
        apartment: "",
        staircase: "",
        floor: "",
        city: "",
        paymentMethod: "card",
        notes: "",
        scheduledDate: "", // nou: data programării
        scheduledTime: "Cât mai curând", // nou: ora programării (implicit)
    });

    const [formErrors, setFormErrors] = useState({});
    const [captchaVerified, setCaptchaVerified] = useState(false);

    const STICKY_HEADER_HEIGHT = 100;

    const [selectedCategory, setSelectedCategory] = useState("");
    const categoryRefs = useRef({});

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isAfterOpening =
        currentHour > 10 || (currentHour === 11 && currentMinute >= 0);
    const isBeforeClosing =
        currentHour < 21 || (currentHour === 21 && currentMinute <= 30);

    const isWorkingHours = isAfterOpening && isBeforeClosing;

    const workingMessage = !isWorkingHours
        ? currentHour < 10 || (currentHour === 10 && currentMinute < 0)
            ? "Programul de livrări începe la ora 11:00."
            : "Programul de livrări s-a încheiat pentru azi. Revenim mâine la 11:00."
        : "";

    const today = new Date().toISOString().split("T")[0];

    // Telefon românesc - începe cu 07 și are 10 cifre
    const phoneRegex = /^07\d{8}$/;

    // Email simplu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const isPhoneValid = phoneRegex.test(formData.phone);
    const isEmailValid = emailRegex.test(formData.email);

    const slides = [
        {
            id: 1,
            variant: "default",
            img: "/img/cover-delivery.png",
            title: "Oșu Kurtos și Langos",
            subtitle: (
                <>
                    Program Locație: L-D: 10:00 - 24:00
                    {/*<br />Program Livrări: 11:00 - 21:30 */}
                    <br />
                    Str. Egretei 1, Brașov
                </>
            ),
            link: "#maijos",
            ctaHref: "#maijos", // where the CTA should go
            ctaLabel: "Comandă acum!",
        },
        // {
        //     id: 2,
        //     variant: "cozonaci",
        //     img: "/img/cozonaci.jpeg",
        //     title: "Cozonac Artizanal de Crăciun",
        //     subtitle:
        //         "Disponibil doar în sezon • Făcut în casă și cu umplutură generoasă",
        //     link: "/editie-speciala",
        //     ctaHref: "/editie-speciala", // where the CTA should go
        //     ctaLabel: "Vezi mai multe!",
        // },
    ];

    const [current, setCurrent] = useState(0);

    // Auto-advance; when at the last slide, reset to 0 (loop),
    // but arrows still hide contextually at the ends.
    useEffect(() => {
        const t = setInterval(() => {
            setCurrent((p) => (p === slides.length - 1 ? 0 : p + 1));
        }, 5000);
        return () => clearInterval(t);
    }, [slides.length]);

    const hasPrev = current > 0;
    const hasNext = current < slides.length - 1;

    const prev = () => setCurrent((p) => Math.max(0, p - 1));
    const next = () => setCurrent((p) => Math.min(slides.length - 1, p + 1));

    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);

    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
        setTouchEndX(null);
    };

    const handleTouchMove = (e) => {
        setTouchEndX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (touchStartX === null || touchEndX === null) return;

        const diff = touchStartX - touchEndX;
        const threshold = 50; // px – how much the user has to swipe

        if (Math.abs(diff) > threshold) {
            if (diff > 0 && current < slides.length - 1) {
                // swipe left -> next
                next();
            } else if (diff < 0 && current > 0) {
                // swipe right -> prev
                prev();
            }
        }

        setTouchStartX(null);
        setTouchEndX(null);
    };

    const generateTimeOptions = (startHour, endHour, stepMinutes) => {
        const options = [];
        for (let h = startHour; h <= endHour; h++) {
            options.push(`${h.toString().padStart(2, "0")}:00`);
            if (stepMinutes === 30 && h < endHour) {
                options.push(`${h.toString().padStart(2, "0")}:30`);
            }
        }
        return options;
    };

    useEffect(() => {
        categoryRefs.current["Locatie"] = document.getElementById("locatie");
        categoryRefs.current["Contact"] = document.getElementById("contact");
    }, []);

    useEffect(() => {
        if (!isCartOpen) return;

        function handleClickOutside(event) {
            if (cartRef.current && !cartRef.current.contains(event.target)) {
                closeCart();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isCartOpen]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const category =
                            entry.target.getAttribute("data-category");
                        if (category) setSelectedCategory(category);
                    }
                });
            },
            {
                rootMargin: `-${STICKY_HEADER_HEIGHT + 10}px 0px 0px 0px`,
                threshold: 0.3,
            },
        );

        const elements = Object.entries(categoryRefs.current);
        elements.forEach(([cat, el]) => {
            if (el) {
                el.setAttribute("data-category", cat);
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const offset = 180; // padding for sticky header
            let current = null;

            Object.entries(categoryRefs.current).forEach(([cat, ref]) => {
                if (ref && ref.offsetTop - offset <= window.scrollY) {
                    current = cat;
                }
            });

            if (current !== selectedCategory) {
                setSelectedCategory(current);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [selectedCategory]);

    useEffect(() => {
        fetch("/stripe-products")
            .then((res) => res.json())
            .then((data) => {
                console.log("Stripe fetch response:", data);

                if (!Array.isArray(data)) {
                    throw new Error(
                        "Răspunsul de la /stripe-products nu este un array!",
                    );
                }

                const withOptions = data.map((product) => {
                    try {
                        const metadata = product.metadata || {};
                        const options = metadata.options
                            ? JSON.parse(metadata.options)
                            : [];
                        const oneOption = metadata.oneoption
                            ? JSON.parse(metadata.oneoption)
                            : [];

                        product.options =
                            options.length > 0 ? options : oneOption;
                        product.isSingleOption = oneOption.length > 0;
                    } catch {
                        product.options = [];
                        product.isSingleOption = false;
                    }
                    return product;
                });
                setProducts(withOptions);
            })
            .catch((err) => console.error("Stripe fetch error:", err));
    }, []);

    useEffect(() => {
        const savedCart = localStorage.getItem("osu_cart");
        if (savedCart) {
            setCartItems(JSON.parse(savedCart));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("osu_cart", JSON.stringify(cartItems));
    }, [cartItems]);

    useEffect(() => {
        const shouldBlockScroll = selectedProduct !== null || isCartOpen;
        document.body.style.overflow = shouldBlockScroll ? "hidden" : "auto";

        // cleanup la demontare
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [selectedProduct, isCartOpen]);

    useEffect(() => {
        if (selectedProduct) {
            setIsAnimatingOut(false); // resetăm animația când se deschide
        }
    }, [selectedProduct]);

    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            closeModal();
        }, 300); // durata animatiei
    };

    const categoryOrder = [
        "Ediție Limitată",
        "Produse de Post",
        "Langos",
        "Kurtos Umplut",
        "Kurtos",
        "Băuturi",
    ];

    // Grupează produsele pe categorii
    const grouped = products.reduce((acc, product) => {
        const key = product.category;
        if (!acc[key]) acc[key] = [];
        acc[key].push(product);
        return acc;
    }, {});

    // Sortează categoriile în funcție de ordinea dorită
    const categories = Object.keys(grouped).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // Sortează categoriile în funcție de ordine, dar elimină cele fără produse
    const sortedCategories = [
        ...categoryOrder,
        ...Object.keys(grouped).filter((cat) => !categoryOrder.includes(cat)),
    ].filter((cat) => grouped[cat]?.length > 0);

    const closeModal = () => {
        setSelectedProduct(null);
        setSelectedOptions([]);
    };

    const getEffectivePrice = () => {
        if (!selectedProduct) return 0;

        const hasMuschi = selectedOptions.some(
            (opt) =>
                opt.toLowerCase().includes("mușchi") ||
                opt.toLowerCase().includes("muschi"),
        );

        if (Array.isArray(selectedProduct.prices)) {
            // Caută by option dacă există
            const basic = selectedProduct.prices.find(
                (p) => p.metadata?.option?.toLowerCase() === "basic",
            );

            const withMuschi = selectedProduct.prices.find(
                (p) => p.metadata?.option?.toLowerCase() === "with_muschi",
            );

            const selected = hasMuschi ? withMuschi : basic;

            // Dacă nu are nici basic nici with_muschi, ia primul cu valoare > 0
            const fallback = selectedProduct.prices.find(
                (p) => p.unit_amount > 0,
            );

            return selected?.unit_amount ?? fallback?.unit_amount ?? 0;
        }

        return selectedProduct.price || 0;
    };

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 180; // + offset

            let current = null;

            for (const cat of categories) {
                const el = categoryRefs.current[cat];
                if (el) {
                    const top = el.offsetTop;
                    if (scrollPosition >= top) {
                        current = cat;
                    }
                }
            }

            if (current !== selectedCategory) {
                setSelectedCategory(current);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [categories, selectedCategory]);

    const addToCart = (product, options = []) => {
        const optionDesc = options.join(", ");
        const cartKey = `${product.id}-${optionDesc}`;

        const hasMuschi = options.some(
            (opt) =>
                opt.toLowerCase().includes("mușchi") ||
                opt.toLowerCase().includes("muschi"),
        );

        let basePrice = 0;

        if (Array.isArray(product.prices)) {
            const basic = product.prices.find(
                (p) => p.metadata?.option?.toLowerCase() === "basic",
            );

            const withMuschi = product.prices.find(
                (p) => p.metadata?.option?.toLowerCase() === "with_muschi",
            );

            const selected = hasMuschi ? withMuschi : basic;
            const fallback = product.prices.find((p) => p.unit_amount > 0);

            basePrice = selected?.unit_amount ?? fallback?.unit_amount ?? 0;
        } else {
            basePrice = product.price || 0;
        }

        setCartItems((prev) => {
            const existing = prev.find((item) => item.cartKey === cartKey);
            if (existing) {
                return prev.map((item) =>
                    item.cartKey === cartKey
                        ? { ...item, qty: item.qty + 1 }
                        : item,
                );
            } else {
                return [
                    ...prev,
                    {
                        ...product,
                        option: optionDesc,
                        cartKey,
                        qty: 1,
                        price: basePrice,
                        name: product.name,
                    },
                ];
            }
        });
    };

    const openCart = () => {
        setShowCart(true);
        setTimeout(() => setIsCartOpen(true), 10); // trigger animation
    };

    const closeCart = () => {
        setIsCartOpen(false);
        setTimeout(() => setShowCart(false), 300); // așteptăm animatia
    };

    const updateQuantity = (cartKey, delta) => {
        setCartItems((prev) =>
            prev
                .map((item) =>
                    item.cartKey === cartKey
                        ? { ...item, qty: item.qty + delta }
                        : item,
                )
                .filter((item) => item.qty > 0),
        );
    };

    const stripePromise = loadStripe(
        // "pk_test_51RWwVvGdiCrjXCJPiibfppHWqcGDeleP4lJJd1e0urRYgUpAePRc2gGQgCQML8PaHJbVwNoqm7oWm36ao0k0rRUJ00x7AxhAap"
        "pk_live_51RWwVcGrsyEky6rcB0YtwifR8JwxQenPKJx1YS0iYlsZTGJiywebGqnJlZdBl1c9f1j5FD48FGLx974zydC2fUjc00WYdqKaNi",
    );

    const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.qty,
        0,
    );

    // dacă e ridicare personală => transport 0
    const isPickup = formData.deliveryType === "ridicare";

    const discountedSubtotal = subtotal * ((100 - discount) / 100);
    const transportFee = isPickup ? 0 : discountedSubtotal >= 8000 ? 0 : 1800;

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
            console.log("REZ promo:", data);

            if (data.valid) {
                setDiscount(data.discount);
                setPromoStatus(`Cod valid: -${data.discount}%`);
            } else {
                setDiscount(0);
                setPromoStatus("Cod invalid");
            }
        } catch (error) {
            setPromoStatus("Eroare la validare cod");
            console.error("Promo code validation error:", error);
        }
    };

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

        if (
            formData.scheduledTime !== "Cât mai curând" &&
            (!formData.scheduledDate || !formData.scheduledTime)
        ) {
            setFormErrors({
                general:
                    "Te rugăm să selectezi o dată și o oră pentru livrare.",
            });
            return;
        }

        if (formData.paymentMethod === "cash") {
            sendOrderEmail();
            return;
        }

        try {
            const transportItem = {
                name: "Taxa de transport",
                option: "-",
                price: transportFee, // în bani (ex: 1600 pentru 16 RON)
                quantity: 1,
            };

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
                        ...(transportFee > 0 ? [transportItem] : []),
                    ],
                    promoCode: promoCode.trim(),
                    orderData: formData,
                    discount: discount,
                    total: total,
                }),
            });

            localStorage.setItem(
                "osu_order_data",
                JSON.stringify({
                    formData,
                    items: cartItems,
                    discount,
                    total,
                }),
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

    const toggleOption = (option) => {
        setSelectedOptions((prev) =>
            prev.includes(option)
                ? prev.filter((opt) => opt !== option)
                : [...prev, option],
        );
    };

    const sendOrderEmail = () => {
        const emailData = {
            // toate datele tale rămân aici
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
            scheduledTime: formData.scheduledTime || "Cât mai curând",
            items: cartItems
                .map((item) => {
                    const originalTotal = (item.qty * item.price) / 100;
                    const discountedTotal =
                        originalTotal * ((100 - discount) / 100);

                    if (discount > 0) {
                        return `${item.name} (${item.option}) x ${
                            item.qty
                        } = ${discountedTotal.toFixed(
                            2,
                        )} RON (redus din ${originalTotal.toFixed(
                            2,
                        )} RON, -${discount}%)`;
                    } else {
                        return `${item.name} (${item.option}) x ${
                            item.qty
                        } = ${originalTotal.toFixed(2)} RON`;
                    }
                })
                .join("\n"),
            total: (total / 100).toFixed(2),
        };

        emailjs
            .send(
                "service_wz043lj",
                "template_fx2v89x",
                emailData,
                "xweu0E67NPFqknP_c",
            )
            .then(() => {
                setOrderSuccessMessage("✅ Comanda a fost trimisă cu succes!");
                localStorage.removeItem("osu_cart");
                closeCart(false);

                setTimeout(() => {
                    setOrderSuccessMessage("");
                    window.location.reload();
                }, 4000); // mesajul dispare după 4 secunde
            })
            .catch((error) => console.error("EmailJS error:", error));
    };

    const handleCategoryClick = (cat) => {
        const element = categoryRefs.current[cat];
        if (element) {
            const offset = 170;
            const top =
                element.getBoundingClientRect().top +
                window.pageYOffset -
                offset;

            window.scrollTo({
                top,
                behavior: "smooth",
            });
        }
    };

    const totalItemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

    const form = useRef();

    const sendEmail = (e) => {
        e.preventDefault();

        const formEl = form.current;
        const name = formEl.user_name.value.trim();
        const email = formEl.user_email.value.trim();
        const phone = formEl.user_phone.value.trim();
        const message = formEl.message.value.trim();

        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isValidPhone = /^0\d{9}$/.test(phone); // Număr românesc

        if (!isValidEmail) {
            setContactStatus({
                message: "Adresa de email nu este validă.",
                success: false,
            });
            return;
        }

        if (!isValidPhone) {
            setContactStatus({
                message:
                    "Numărul de telefon trebuie să aibă 10 cifre și să înceapă cu 0.",
                success: false,
            });
            return;
        }

        emailjs
            .sendForm(
                "service_p8d703k",
                "template_lfv6klb",
                formEl,
                "BGDnmfh9gasmMLC2U",
            )
            .then(
                () => {
                    setContactStatus({
                        message: "Mesaj trimis cu succes!",
                        success: true,
                    });
                    formEl.reset();
                },
                (error) => {
                    console.error("EmailJS error:", error);
                    setContactStatus({
                        message: "Eroare la trimiterea mesajului.",
                        success: false,
                    });
                },
            );
    };

    function generateTimeOptionsDynamic(selectedDate) {
        const now = new Date();
        const todayDateString = now.toISOString().split("T")[0];

        // dacă e azi
        if (selectedDate === todayDateString) {
            const nextHour = now.getHours() + 2;
            const startHour = Math.min(Math.max(nextHour, 10), 21);
            return generateTimeOptions(startHour, 21, 30);
        }

        // altfel default 10-21
        return generateTimeOptions(10, 21, 30);
    }

    return (
        <SiteLayout
            totalItemCount={totalItemCount}
            subtotal={subtotal}
            setIsCartOpen={openCart}
        >
            {/* Mobile – Categorii cu scroll orizontal și fundal verde */}
            <div className="block md:hidden overflow-x-auto whitespace-nowrap px-4 py-3 bg-emerald-800 sticky top-[100px] z-30">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className={`inline-block mr-4 text-sm font-medium uppercase ${
                            selectedCategory === cat
                                ? "text-white font-bold"
                                : "text-gray-300"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            <main className="max-w-6xl mx-auto py-10 md:px-6 pt-[120px] md:pt-[130px]">
                <div className="max-w-6xl mx-auto px-4 md:px-0 md:pb-10">
                    {/* Rounded container only */}
                    <div
                        className="relative overflow-hidden rounded-2xl group w-full select-none touch-pan-y"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Track */}
                        <div
                            className="flex transition-transform duration-700 ease-in-out"
                            style={{
                                transform: `translateX(-${current * 100}%)`,
                            }}
                        >
                            {slides.map((s) => {
                                const hasCTA = Boolean(s.ctaHref || s.ctaLabel);

                                const handleCTA = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    if (s.ctaHref?.startsWith("#")) {
                                        // smooth scroll to section
                                        const target = document.querySelector(
                                            s.ctaHref,
                                        );
                                        if (target) {
                                            const offset = 100; // adjust if you have a fixed navbar
                                            const top =
                                                target.getBoundingClientRect()
                                                    .top +
                                                window.scrollY -
                                                offset;
                                            window.scrollTo({
                                                top,
                                                behavior: "smooth",
                                            });
                                        }
                                    } else if (s.ctaHref) {
                                        // normal navigation
                                        window.location.href = s.ctaHref;
                                    }
                                };

                                return (
                                    <a
                                        key={s.id}
                                        href={s.link}
                                        className="min-w-full basis-full shrink-0 block relative"
                                    >
                                        <div className="relative w-full h-[58vw] sm:h-[48vw] md:h-[420px] lg:h-[480px]">
                                            <img
                                                src={s.img}
                                                alt={s.title}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/30" />

                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-3 sm:px-4">
                                                {s.variant === "cozonaci" ? (
                                                    <>
                                                        <span className="inline-block bg-red-600/90 text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-3">
                                                            EDIȚIE LIMITATĂ
                                                        </span>
                                                        <h1 className="text-lg sm:text-2xl md:text-4xl font-bold mb-2 drop-shadow">
                                                            {s.title}
                                                        </h1>
                                                        <p className="text-xs sm:text-sm md:text-base opacity-95">
                                                            {s.subtitle}
                                                        </p>
                                                        {hasCTA && (
                                                            <button
                                                                onClick={
                                                                    handleCTA
                                                                }
                                                                className="mt-8 px-5 py-2 rounded-md font-bold bg-emerald-800 hover:bg-red-500 transition hidden md:block"
                                                            >
                                                                {s.ctaLabel ||
                                                                    "Află mai mult"}
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <h1 className="text-lg sm:text-xl md:text-4xl font-bold mb-1 sm:mb-2 drop-shadow">
                                                            {s.title}
                                                        </h1>
                                                        <h2 className="text-xs sm:text-sm md:text-base opacity-95 leading-snug">
                                                            {s.subtitle}
                                                        </h2>
                                                        {hasCTA && (
                                                            <button
                                                                onClick={
                                                                    handleCTA
                                                                }
                                                                className="mt-8 px-4 py-2 rounded-md font-semibold bg-red-600 hover:bg-red-700 transition hidden md:block"
                                                            >
                                                                {s.ctaLabel}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>

                        {/* Subtle, contextual arrows (outside links) */}
                        {hasPrev && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    prev();
                                }}
                                aria-label="Previous slide"
                                className="absolute left-2 sm:left-3 md:left-5 top-1/2 -translate-y-1/2 z-20
                       text-white/70 hover:text-white
                       bg-white/10 hover:bg-white/20
                       opacity-60 group-hover:opacity-100
                       p-2 rounded-full backdrop-blur-sm transition hidden md:block"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-5 h-5 md:w-6 md:h-6"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 19.5 8.25 12l7.5-7.5"
                                    />
                                </svg>
                            </button>
                        )}

                        {hasNext && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    next();
                                }}
                                aria-label="Next slide"
                                className="absolute right-2 sm:right-3 md:right-5 top-1/2 -translate-y-1/2 z-20
                       text-white/70 hover:text-white
                       bg-white/10 hover:bg-white/20
                       opacity-60 group-hover:opacity-100
                       p-2 rounded-full backdrop-blur-sm transition hidden md:block"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-5 h-5 md:w-6 md:h-6"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                                    />
                                </svg>
                            </button>
                        )}

                        {/* Dots */}
                        <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setCurrent(i);
                                    }}
                                    aria-label={`Go to slide ${i + 1}`}
                                    className={`h-2.5 rounded-full transition-all ${
                                        current === i
                                            ? "w-6 bg-white"
                                            : "w-2.5 bg-white/50 hover:bg-white/70"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Categories (left column) */}
                    <div className="md:col-span-1 hidden md:block">
                        <div className="sticky top-[130px] space-y-2 ml-10">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategoryClick(cat)}
                                    className={`w-full text-left  px-2 py-1 text-gray-500 hover:text-black uppercase ${
                                        selectedCategory === cat
                                            ? "text-black font-semibold"
                                            : ""
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                            <button
                                onClick={() => handleCategoryClick("Locatie")}
                                className="w-full text-left px-2 py-1 text-gray-500 hover:text-black uppercase"
                            >
                                Locație
                            </button>
                            <button
                                onClick={() => handleCategoryClick("Contact")}
                                className="w-full text-left px-2 py-1 text-gray-500 hover:text-black uppercase"
                            >
                                Contact
                            </button>
                        </div>
                    </div>
                    <div className="md:col-span-3 space-y-10">
                        {/* Delivery info */}
                        <div className="grid grid-cols-1 divide-x divide-gray-300 mt-6 text-center font-bold text-gray-400 px-4 md:px-0">
                            {/* <div className="flex flex-col items-center justify-center text-sm">
                                <span className="text-lg text-black">
                                    18.00 RON
                                </span>
                                <span className="text-xs">livrare</span>
                            </div> */}
                            <div className="flex flex-col items-center justify-center text-sm">
                                <span className="text-lg text-black">
                                    45–55
                                </span>
                                <span className="text-xs">min</span>
                            </div>
                        </div>
                        {/* <div>
                            <h1 className="text-sm md:text-md text-center mt-6 px-4 md:px-0">
                                Livrare în: Brașov, Ghimbav, Cristian, Sânpetru,
                                Stupini și Hărman
                            </h1>
                        </div> */}
                        {/* Scrollable promo cards */}
                        <div className="mt-6 overflow-x-auto scrollbar-hide px-4 md:px-0">
                            <div className="flex space-x-2 md:space-x-4 md:px-0">
                                {/* Card 1: Livrare gratuită */}
                                <div className="flex items-center bg-gray-100 rounded-2xl p-4 md:min-w-[310px] min-w-[260px] relative pl-24">
                                    <img
                                        src="/img/deliver.png" // <- înlocuiește cu calea reală
                                        alt="Delivery"
                                        className=" h-20 object-contain absolute left-0 bottom-0"
                                    />
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">
                                            Comenzi telefonice
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            0759 673 848
                                        </p>
                                    </div>
                                </div>

                                {/* Card 2: Reducere cu cod */}
                                <div className="flex items-center bg-gray-100 rounded-2xl p-4 md:min-w-[310px] min-w-[260px] relative pl-24">
                                    <img
                                        src="/img/leaf.png" // <- înlocuiește cu calea reală
                                        alt="Discount"
                                        className=" h-20 object-contain absolute left-0 bottom-0"
                                    />
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">
                                            Despre Comenzi
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            Acceptam doar <br />
                                            Comenzi telefonice
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h2
                            id="maijos"
                            className="text-2xl md:text-3xl font-bold text-center mb-10"
                        >
                            Produse disponibile
                        </h2>

                        {sortedCategories.map((category) => {
                            const items = grouped[category];

                            return (
                                <div
                                    key={category}
                                    ref={(el) =>
                                        (categoryRefs.current[category] = el)
                                    }
                                >
                                    <h2 className="text-xl font-bold mb-4 mx-4">
                                        {category}
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-0 mx-2">
                                        {items
                                            .slice()
                                            .reverse()
                                            .map((product) => {
                                                let displayPrice =
                                                    product.price;

                                                if (
                                                    Array.isArray(
                                                        product.prices,
                                                    )
                                                ) {
                                                    const basic =
                                                        product.prices.find(
                                                            (p) =>
                                                                p.metadata
                                                                    ?.option ===
                                                                "basic",
                                                        );
                                                    if (basic) {
                                                        displayPrice =
                                                            basic.unit_amount;
                                                    }
                                                }

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className="flex flex-row m-2 bg-white border border-gray-200 rounded-lg min-h-[160px] shadow-md md:shadow-none hover:shadow-md transition"
                                                        onClick={() =>
                                                            setSelectedProduct(
                                                                product,
                                                            )
                                                        }
                                                    >
                                                        {/* Stânga: Text */}
                                                        <div className="flex flex-col md:py-4 justify-between md:flex-[0.9] flex-1 md:px-4 py-2 pl-3">
                                                            <div>
                                                                <h3 className="text-md font-bold mb-1">
                                                                    {
                                                                        product.name
                                                                    }
                                                                </h3>
                                                                {product.description && (
                                                                    <p className="text-gray-600 text-xs italic mb-2">
                                                                        {product
                                                                            .description
                                                                            .length >
                                                                        50
                                                                            ? product.description.slice(
                                                                                  0,
                                                                                  50,
                                                                              ) +
                                                                              "..."
                                                                            : product.description}
                                                                    </p>
                                                                )}
                                                                <p className="text-gray-600 text-sm italic mb-2">
                                                                    {product
                                                                        .metadata
                                                                        ?.gramaj ||
                                                                        "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-lg font-bold block mb-2">
                                                                    {(
                                                                        displayPrice /
                                                                        100
                                                                    ).toFixed(
                                                                        2,
                                                                    )}{" "}
                                                                    RON
                                                                </span>
                                                                {/* <button
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setSelectedProduct(
                                                                            product,
                                                                        );
                                                                        setSelectedOptions(
                                                                            [],
                                                                        );
                                                                    }}
                                                                    className="bg-emerald-800 text-white px-4 py-2 text-sm rounded hover:bg-red-500 font-bold hidden md:block"
                                                                >
                                                                    Adaugă
                                                                </button> */}
                                                            </div>
                                                        </div>

                                                        {/* Dreapta: Imagine + coloană */}
                                                        <div className="flex flex-col items-center justify-center mr-2 w-32 md:w-48 rounded-md">
                                                            <div className="md:ml-10 relative w-full md:h-full h-20 min-h-[100px]">
                                                                <img
                                                                    src={
                                                                        product.image
                                                                    }
                                                                    alt={
                                                                        product.name
                                                                    }
                                                                    loading="lazy"
                                                                    className="w-full md:h-full md:object-cover object-contain rounded-md"
                                                                />
                                                                {/* <button
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setSelectedProduct(
                                                                            product,
                                                                        );
                                                                        setSelectedOptions(
                                                                            [],
                                                                        );
                                                                    }}
                                                                    className="absolute bottom-0 md:hidden right-0 bg-emerald-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-red-500 shadow"
                                                                >
                                                                    +
                                                                </button> */}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
            <section id="locatie" className=" mx-auto py-10 text-center">
                <h2 className="text-3xl font-bold mb-6">
                    Vrei să ne vizitezi?
                </h2>
                <p className="text-gray-600 mb-10">
                    Aici este locația noastră!
                </p>

                <div className="w-full h-96 overflow-hidden shadow-lg border border-gray-300">
                    <iframe
                        title="Locație Osu"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d499.0492402131647!2d25.564468792704826!3d45.664276020213336!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b35b0050861a07%3A0xcd6693c330236943!2zT8iYVSBLdXJ0b3MgyJlpIExhbmdvyJk!5e0!3m2!1sen!2sro!4v1750363162698!5m2!1sen!2sro"
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-full"
                    ></iframe>
                </div>
            </section>
            <section
                id="contact"
                className="max-w-3xl mx-auto px-4 py-10 text-center"
            >
                <h2 className="text-3xl font-bold mb-6">Contactează-ne</h2>
                <p className="text-gray-600 mb-10">
                    Ai alte întrebări? Lasă-ne un mesaj și revenim rapid!
                </p>

                <form ref={form} onSubmit={sendEmail} className="space-y-6">
                    <input
                        type="text"
                        name="user_name"
                        placeholder="Nume"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 shadow-sm placeholder-italic placeholder-gray-400 focus:ring-2 focus:ring-emerald-800 focus:outline-none"
                    />
                    <input
                        type="email"
                        name="user_email"
                        placeholder="Email"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 shadow-sm placeholder-italic placeholder-gray-400 focus:ring-2 focus:ring-emerald-800 focus:outline-none"
                    />
                    <input
                        type="tel"
                        name="user_phone"
                        placeholder="Telefon"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 shadow-sm placeholder-italic placeholder-gray-400 focus:ring-2 focus:ring-emerald-800 focus:outline-none"
                    />
                    <textarea
                        name="message"
                        rows="5"
                        placeholder="Mesaj"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 shadow-sm placeholder-italic placeholder-gray-400 focus:ring-2 focus:ring-emerald-800 focus:outline-none"
                    ></textarea>
                    {contactStatus.message && (
                        <p
                            className={`text-sm ${
                                contactStatus.success
                                    ? "text-green-600"
                                    : "text-red-600"
                            }`}
                        >
                            {contactStatus.message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="bg-emerald-800 text-white px-6 py-3 rounded-full font-bold hover:bg-red-500 transition"
                    >
                        Trimite mesajul
                    </button>
                </form>
            </section>

            {selectedProduct && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleClose}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-white p-6 rounded-lg shadow-xl max-w-md w-full relative transform transition duration-300 ease-out
          ${isAnimatingOut ? "animate-fadeOut" : "animate-fadeIn"}`}
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
                            className="w-full h-full object-cover rounded mb-4"
                        />

                        <h3 className="text-2xl font-bold mb-2">
                            {selectedProduct.name}
                        </h3>
                        <p className="text-gray-700 text-sm mb-4">
                            {selectedProduct.description}
                        </p>

                        {selectedProduct.options &&
                            selectedProduct.options.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-gray-700 mb-1">
                                        {selectedProduct.isSingleOption
                                            ? "Alege o opțiune:"
                                            : "Alege una sau mai multe opțiuni:"}
                                    </label>
                                    <div className="space-y-2">
                                        {selectedProduct.options.map(
                                            (opt, idx) => (
                                                <label
                                                    key={idx}
                                                    className="flex items-center space-x-2"
                                                >
                                                    <input
                                                        type={
                                                            selectedProduct.isSingleOption
                                                                ? "radio"
                                                                : "checkbox"
                                                        }
                                                        name="productOption"
                                                        value={opt}
                                                        checked={
                                                            selectedProduct.isSingleOption
                                                                ? selectedOptions[0] ===
                                                                  opt
                                                                : selectedOptions.includes(
                                                                      opt,
                                                                  )
                                                        }
                                                        onChange={() => {
                                                            if (
                                                                selectedProduct.isSingleOption
                                                            ) {
                                                                setSelectedOptions(
                                                                    [opt],
                                                                );
                                                            } else {
                                                                toggleOption(
                                                                    opt,
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <span>{opt}</span>
                                                </label>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                        <p className="text-lg font-semibold mb-4">
                            {(getEffectivePrice() / 100).toFixed(2)} RON
                        </p>
                        <button
                            onClick={() => {
                                // addToCart(selectedProduct, selectedOptions);
                                handleClose();
                            }}
                            className="w-full bg-emerald-800 text-white py-2 rounded hover:bg-red-500 font-bold"
                        >
                            {/* Adaugă în coș */}
                            Închide
                        </button>
                    </div>
                </div>
            )}

            {/* {orderSuccessMessage && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white text-emerald-800 text-xl font-bold px-6 py-4 rounded-lg shadow-xl text-center max-w-md w-full">
                        {orderSuccessMessage}
                    </div>
                </div>
            )}

            {showCart && (
                <div
                    className={` fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
                        isCartOpen ? "opacity-100" : "opacity-0"
                    }`}
                >
                    <div
                        className={`bg-white rounded-lg shadow-xl transform transition-all duration-300 ${
                            isCartOpen
                                ? "scale-100 opacity-100"
                                : "scale-95 opacity-0"
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
                                    {/* <pre className="text-xs text-gray-400 overflow-x-auto">
                                    {JSON.stringify(cartItems, null, 2)}
                                </pre> *
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
                                    <div className="mb-4">
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
                                    </div>
                                </>
                            )}

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
                                    <span>
                                        {(subtotal / 100).toFixed(2)} RON
                                    </span>
                                )}
                            </p>

                            <p className="text-sm text-gray-700 my-2 italic">
                                {formData.deliveryType === "ridicare"
                                    ? "Ridicare personală – fără cost transport"
                                    : transportFee > 0
                                    ? `+ Transport: ${(
                                          transportFee / 100
                                      ).toFixed(2)} RON (gratuit peste 80 RON)`
                                    : "Transport gratuit (comenzi peste 80 RON)"}
                            </p>

                            <p className="text-lg font-semibold mb-4">
                                Total:{" "}
                                <span>{(total / 100).toFixed(2)} RON</span>
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

                            <h5 className="text-2xl font-bold my-4">
                                Livrare sau Ridicare
                            </h5>
                            <select
                                required
                                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 mb-4 placeholder-italic"
                                value={formData.deliveryType}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        deliveryType: e.target.value,
                                    })
                                }
                            >
                                <option value="livrare">Livrare</option>
                                <option value="ridicare">
                                    Ridicare personală
                                </option>
                            </select>

                            {formData.deliveryType === "livrare" && (
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
                                            <option value="">
                                                Localitate *
                                            </option>
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
                            )}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Livrare programată (opțional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className={`w-1/2 border ${
                                            dateError
                                                ? "border-red-500"
                                                : "border-gray-300"
                                        } rounded-md shadow-sm px-3 py-2 placeholder-italic`}
                                        value={formData.scheduledDate || today}
                                        min={today}
                                        onChange={(e) => {
                                            const newDate = e.target.value;
                                            if (newDate < today) {
                                                setDateError(
                                                    "Nu poți selecta o zi în trecut."
                                                );
                                            } else {
                                                setDateError("");
                                                setFormData({
                                                    ...formData,
                                                    scheduledDate: newDate,
                                                    scheduledTime: "asap", // resetezi ora
                                                });
                                            }
                                        }}
                                    />

                                    <select
                                        className="w-1/2 border border-gray-300 rounded-md shadow-sm px-3 py-2 placeholder-italic"
                                        value={formData.scheduledTime || "asap"}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                scheduledTime: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="asap">
                                            Cât mai curând
                                        </option>
                                        {generateTimeOptionsDynamic(
                                            formData.scheduledDate || today
                                        ).map((hour) => (
                                            <option key={hour} value={hour}>
                                                {hour}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {dateError && (
                                    <p className="text-red-600 text-sm mt-1">
                                        {dateError}
                                    </p>
                                )}
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
                                <option value="cash">
                                    Plata cash la livrare
                                </option>
                            </select>

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
                                    //live
                                    sitekey="6LeqX14rAAAAAI4xzmtc7bylyMAbvVwDPJvSBi2l"
                                    //test
                                    // sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
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
                                    Coșul este gol. Adaugă produse pentru a
                                    putea plasa comanda.
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
                                    !isWorkingHours ||
                                    cartItems.length === 0 ||
                                    !isPhoneValid ||
                                    !isEmailValid
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-emerald-800 text-white hover:bg-red-500"
                                }`}
                            >
                                Trimite comanda
                            </button>
                        </div>
                    </div>
                </div>
            )} */}
        </SiteLayout>
    );
}
