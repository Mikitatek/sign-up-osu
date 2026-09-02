import React from "react";
import SiteLayout from "@/Layouts/SiteLayout";
import BackButton from "@/Components/BackButton";

/**
 * Valori orientative, estimate pe baza rețetelor de pe platformele de livrare.
 * Coloanele nutriționale sunt per 100 g (mâncare) / 100 ml (băuturi).
 * Alergenii sunt exprimați conform Regulamentului (UE) nr. 1169/2011, Anexa II.
 * A SE VERIFICA de către producător înainte de publicarea finală.
 */

// [sortiment, kcal, grăsimi, saturate, carbo, zaharuri, proteine, fibre, sare, alergeni, notă]
const KURTOS = [
    ["Kürtős Zahăr Caramelizat", 380, 9, 4, 66, 24, 8, 2, 0.8, "Cereale cu gluten (grâu), ouă, lapte", ""],
    ["Kürtős Scorțișoară", 382, 9, 4, 66, 24, 8, 2.5, 0.8, "Cereale cu gluten (grâu), ouă, lapte", ""],
    ["Kürtős Cacao", 395, 11, 6, 64, 24, 8, 3, 0.8, "Cereale cu gluten (grâu), ouă, lapte", ""],
    ["Kürtős Cocos", 430, 17, 12, 62, 25, 8, 3.5, 0.8, "Cereale cu gluten (grâu), ouă, lapte", "conține cocos"],
    ["Kürtős Nucă", 450, 20, 5, 60, 23, 10, 3, 0.8, "Cereale cu gluten (grâu), ouă, lapte, fructe cu coajă lemnoasă (nucă)", ""],
    ["Kürtős Nucă cu Scorțișoară", 448, 19, 5, 61, 23, 10, 3, 0.8, "Cereale cu gluten (grâu), ouă, lapte, fructe cu coajă lemnoasă (nucă)", ""],
    ["Kürtős Fistic", 445, 18, 5, 61, 23, 10, 3, 0.8, "Cereale cu gluten (grâu), ouă, lapte, fructe cu coajă lemnoasă (fistic)", ""],
    ["Kürtős Oreo", 420, 15, 6, 64, 26, 8, 2.5, 0.9, "Cereale cu gluten (grâu), ouă, lapte, soia", ""],
];

const KURTOS_UMPLUT = [
    ["Kürtős Umplut Bounty", 460, 21, 12, 60, 32, 7, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, soia, fructe cu coajă lemnoasă (alune de pădure)", "conține cocos"],
    ["Kürtős Umplut Dubai", 470, 23, 9, 58, 30, 8, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, soia, fructe cu coajă lemnoasă (fistic, alune de pădure)", ""],
    ["Kürtős Umplut Raffaello", 470, 24, 14, 58, 30, 7, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, soia, fructe cu coajă lemnoasă (migdale)", "conține cocos"],
    ["Kürtős Umplut Nucă cu Nutella", 465, 23, 8, 58, 30, 8, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, soia, fructe cu coajă lemnoasă (nucă, alune de pădure)", ""],
    ["Kürtős Umplut Nucă cu Zmeură", 445, 19, 6, 61, 33, 8, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, fructe cu coajă lemnoasă (nucă)", "posibil sulfiți (gem)"],
    ["Kürtős Umplut Fistic cu Zmeură", 440, 18, 6, 62, 33, 7, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, fructe cu coajă lemnoasă (fistic)", "posibil sulfiți (gem)"],
    ["Kürtős Umplut Fistic cu Ciocolată Albă", 460, 21, 9, 60, 33, 7, 3, 0.7, "Cereale cu gluten (grâu), ouă, lapte, soia, fructe cu coajă lemnoasă (fistic)", ""],
];

const LANGOS = [
    ["Langoș Simplu", 300, 12, 3, 42, 3, 7, 2, 1.2, "Cereale cu gluten (grâu), lapte", ""],
    ["Langoș Smântână", 330, 16, 6, 40, 3.5, 7, 2, 1.2, "Cereale cu gluten (grâu), lapte", ""],
    ["Langoș Cașcaval", 360, 19, 9, 38, 3, 11, 2, 1.4, "Cereale cu gluten (grâu), lapte", ""],
    ["Langoș Telemea cu Mărar", 350, 18, 8, 38, 3, 10, 2, 1.5, "Cereale cu gluten (grâu), lapte", ""],
    ["Langoș Papanaș", 340, 16, 7, 42, 12, 9, 2, 1.1, "Cereale cu gluten (grâu), lapte", ""],
    ["Langoș Dulceață / Gem", 350, 12, 3, 52, 20, 6, 2, 1.0, "Cereale cu gluten (grâu), lapte", "posibil sulfiți (gem)"],
    ["Langoș Nutella", 380, 17, 7, 50, 22, 7, 2.5, 1.0, "Cereale cu gluten (grâu), lapte, soia, fructe cu coajă lemnoasă (alune de pădure)", ""],
    ["Langoș Țărănesc", 340, 17, 7, 36, 3.5, 12, 2, 1.5, "Cereale cu gluten (grâu), lapte, muștar", ""],
    ["Langoș Haiducesc", 335, 16, 7, 37, 3.5, 12, 2, 1.5, "Cereale cu gluten (grâu), lapte", ""],
    ["Langoș Italian", 345, 18, 7, 35, 3.5, 13, 2, 1.6, "Cereale cu gluten (grâu), lapte, sulfiți (oțet balsamic)", "posibil fructe cu coajă lemnoasă (pesto) și fistic (mortadella)"],
];

// per 100 ml
const BAUTURI = [
    ["Pepsi", 42, 0, 0, 11, 11, 0, 0, 0, "—", "conține cofeină"],
    ["Pepsi Max", 0.3, 0, 0, 0, 0, 0, 0, 0, "—", "conține cofeină și îndulcitori"],
    ["Mirinda", 40, 0, 0, 10, 10, 0, 0, 0, "—", ""],
    ["7Up", 37, 0, 0, 9, 9, 0, 0, 0, "—", ""],
    ["Apă plată / minerală", 0, 0, 0, 0, 0, 0, 0, 0, "—", ""],
    ["Espresso (scurt / lung / dublu)", 2, 0, 0, 0.3, 0, 0.1, 0, 0, "—", "conține cofeină"],
    ["Latte", 55, 2, 1.2, 5, 5, 3.4, 0, 0.1, "Lapte", "conține cofeină"],
    ["Ceai (neîndulcit)", 1, 0, 0, 0.2, 0, 0, 0, 0, "—", ""],
    ["Ciocolată Caldă cu Bezele", 110, 3, 2, 18, 16, 2.5, 1, 0.15, "Lapte, soia", "posibil ouă (bezele)"],
];

const HEADERS = [
    "Sortiment",
    "Kcal",
    "Grăsimi (g)",
    "din care saturate (g)",
    "Carbohidrați (g)",
    "din care zaharuri (g)",
    "Proteine (g)",
    "Fibre (g)",
    "Sare (g)",
    "Alergeni (Reg. UE 1169/2011)",
    "Note",
];

function Section({ title, unit, rows }) {
    return (
        <div className="mb-10">
            <h2 className="mb-2 text-xl font-bold text-emerald-900">{title}</h2>
            <p className="mb-2 text-xs text-gray-500">Valori {unit}</p>
            <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full overflow-hidden rounded-lg bg-white text-sm shadow-md">
                    <thead className="bg-emerald-800 text-white">
                        <tr>
                            {HEADERS.map((h) => (
                                <th
                                    key={h}
                                    className="px-3 py-2 text-left font-semibold"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}
                            >
                                {row.map((cell, j) => (
                                    <td
                                        key={j}
                                        className={
                                            j === 0
                                                ? "px-3 py-2 font-medium"
                                                : j === 9
                                                  ? "px-3 py-2 text-xs"
                                                  : j === 10
                                                    ? "px-3 py-2 text-xs italic text-gray-500"
                                                    : "px-3 py-2 whitespace-nowrap"
                                        }
                                    >
                                        {cell === "" ? "—" : cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ValNutritionale({
    totalItemCount,
    subtotal,
    setIsCartOpen,
}) {
    return (
        <SiteLayout
            totalItemCount={totalItemCount}
            subtotal={subtotal}
            setIsCartOpen={setIsCartOpen}
        >
            <div className="mx-auto max-w-6xl px-4 pb-8 pt-32">
                <BackButton />
                <h1 className="mb-4 text-center text-3xl font-bold">
                    Valori nutriționale și alergeni
                </h1>

                <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Informații orientative</p>
                    <p className="mt-1">
                        Valorile nutriționale de mai jos sunt estimate pe baza
                        rețetelor și pot varia în funcție de porție și de
                        furnizori. Pentru informații exacte și actualizate
                        privind alergenii, întreabă personalul la punctul de
                        lucru (Str. Egretei nr. 1, Brașov) sau scrie-ne la{" "}
                        <a
                            href="mailto:batranul-osu@gmail.com"
                            className="font-medium underline"
                        >
                            batranul-osu@gmail.com
                        </a>
                        .
                    </p>
                    <p className="mt-2">
                        <strong>Contaminare încrucișată:</strong> produsele sunt
                        preparate în aceeași bucătărie în care se folosesc
                        cereale cu gluten, ouă, lapte, soia și fructe cu coajă
                        lemnoasă. Pot exista urme, chiar dacă un ingredient nu
                        este listat explicit.
                    </p>
                </div>

                <Section title="Kürtős" unit="per 100 g" rows={KURTOS} />
                <Section
                    title="Kürtős Umplut"
                    unit="per 100 g"
                    rows={KURTOS_UMPLUT}
                />
                <Section title="Langoș" unit="per 100 g" rows={LANGOS} />
                <Section title="Băuturi" unit="per 100 ml" rows={BAUTURI} />

                <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
                    <p className="font-semibold text-gray-800">
                        Legenda alergenilor (Regulamentul UE nr. 1169/2011,
                        Anexa II)
                    </p>
                    <p className="mt-1">
                        În produsele noastre pot fi prezenți:{" "}
                        <strong>cereale care conțin gluten</strong> (grâu),{" "}
                        <strong>ouă</strong>, <strong>lapte</strong> (inclusiv
                        lactoză), <strong>soia</strong>,{" "}
                        <strong>fructe cu coajă lemnoasă</strong> (nucă, fistic,
                        migdale, alune de pădure), <strong>muștar</strong> și{" "}
                        <strong>dioxid de sulf și sulfiți</strong> (&gt; 10
                        mg/kg). Cocosul și scorțișoara nu sunt alergeni
                        reglementați la nivel UE, dar sunt menționate ca
                        ingrediente.
                    </p>
                    <p className="mt-2">
                        * Categoriile Langoș și Kürtős provin din aluat
                        preparat/congelat în prealabil.
                    </p>
                </div>

                <BackButton className="mt-8" />
            </div>
        </SiteLayout>
    );
}
