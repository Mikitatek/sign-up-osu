import React from "react";
import SiteLayout from "@/Layouts/SiteLayout";
import BackButton from "@/Components/BackButton";

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
            <div className="mx-auto px-4 pb-8 pt-32">
                <BackButton />
                <h1 className="text-3xl font-bold mb-6 text-center">
                    Valori Nutriționale
                </h1>

                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full bg-white shadow-md rounded-lg overflow-hidden text-sm">
                        <thead className="bg-emerald-800 text-white">
                            <tr>
                                <th className="text-left px-3 py-2">
                                    Sortiment
                                </th>
                                <th className="text-left px-3 py-2">
                                    Kcal./100g
                                </th>
                                <th className="text-left px-3 py-2">
                                    Grăsimi (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Acizi grași saturați (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Carbohidrați (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Zaharuri (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Proteine (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Fibre (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Sare (g)
                                </th>
                                <th className="text-left px-3 py-2">
                                    Alergeni
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                [
                                    "Langos Simplu",
                                    326,
                                    7.2,
                                    3.5,
                                    55.3,
                                    2.1,
                                    6.4,
                                    2.1,
                                    1.0,
                                    "Gluten, lactoză",
                                ],
                                [
                                    "Langos Smântână",
                                    344,
                                    8.5,
                                    4.2,
                                    54.8,
                                    3.0,
                                    7.4,
                                    2.1,
                                    1.0,
                                    "Gluten, lactoză",
                                ],
                                [
                                    "Langos Cașcaval",
                                    373,
                                    10.2,
                                    5.8,
                                    54.3,
                                    3.1,
                                    7.3,
                                    2.3,
                                    1.0,
                                    "Gluten, lactoză",
                                ],
                                [
                                    "Langos Telemea",
                                    367,
                                    9.5,
                                    5.4,
                                    54.5,
                                    3.0,
                                    7.1,
                                    2.4,
                                    1.0,
                                    "Gluten, lactoză",
                                ],
                                [
                                    "Langos Nutella",
                                    407,
                                    14.2,
                                    6.3,
                                    57.0,
                                    22.0,
                                    6.5,
                                    2.1,
                                    1.0,
                                    "Gluten, lactoză, alune",
                                ],
                                [
                                    "Langos Gem",
                                    385,
                                    8.0,
                                    3.8,
                                    56.5,
                                    18.0,
                                    6.3,
                                    2.2,
                                    1.0,
                                    "Gluten, lactoză",
                                ],
                                [
                                    "Langos Țărănesc",
                                    365,
                                    9.0,
                                    4.5,
                                    54.2,
                                    3.5,
                                    7.2,
                                    2.5,
                                    1.0,
                                    "Gluten, lactoză, muștar",
                                ],
                                [
                                    "Langos Italian",
                                    369,
                                    9.8,
                                    5.2,
                                    54.0,
                                    3.8,
                                    7.5,
                                    2.6,
                                    1.0,
                                    "Gluten, lactoză, soia",
                                ],
                                [
                                    "Kurtos Simplu",
                                    377,
                                    9.8,
                                    4.5,
                                    63.4,
                                    22.3,
                                    7.2,
                                    1.8,
                                    0.8,
                                    "Gluten, ou, lactoză",
                                ],
                                [
                                    "Kurtos Cacao",
                                    402,
                                    11.6,
                                    10.5,
                                    4.9,
                                    66.2,
                                    7.6,
                                    3.1,
                                    0.8,
                                    "Gluten, ou, lactoză, cacao",
                                ],
                                [
                                    "Kurtos Cocos",
                                    486,
                                    18.4,
                                    11.2,
                                    64.9,
                                    24.1,
                                    7.6,
                                    3.1,
                                    0.8,
                                    "Gluten, ou, lactoză, cocos",
                                ],
                                [
                                    "Kurtos Scorțișoară",
                                    404,
                                    10.2,
                                    4.7,
                                    66.5,
                                    24.4,
                                    9.2,
                                    3.5,
                                    0.8,
                                    "Gluten, ou, lactoză, scorțișoară",
                                ],
                                [
                                    "Kurtos Fistic",
                                    470,
                                    16.7,
                                    5.8,
                                    66.5,
                                    24.4,
                                    7.8,
                                    2.8,
                                    0.8,
                                    "Gluten, ou, lactoză, fistic",
                                ],
                                [
                                    "Kurtos Oreo",
                                    480,
                                    17.2,
                                    6.3,
                                    65.8,
                                    25.2,
                                    8.5,
                                    2.7,
                                    0.8,
                                    "Gluten, ou, lactoză, soia (din Oreo)",
                                ],
                                [
                                    "Kurtos Nucă",
                                    490,
                                    18.5,
                                    65.2,
                                    69.2,
                                    24.5,
                                    9.0,
                                    3.3,
                                    0.8,
                                    "Gluten, ou, lactoză, nuci",
                                ],
                                ["Sucuri", 42, 0, 0, 10.6, 10.6, 0, 0, 0, ""],
                                ["Apă", 0, 0, 0, 0, 0, 0, 0, 0, ""],
                                ["Ceai", 1, 0, 0, 10.6, 10.6, 0, 0, 0, ""],
                                ["Espresso", 2, 0.1, 0, 0.3, 0, 0.1, 0, 0, ""],
                                ["Americano", 2, 0.1, 0, 0.2, 0, 0.1, 0, 0, ""],
                                [
                                    "Cappucino",
                                    45,
                                    1.5,
                                    1.0,
                                    5.0,
                                    4.0,
                                    3.0,
                                    0,
                                    0,
                                    "lactoză",
                                ],
                                [
                                    "Latte",
                                    54,
                                    2.0,
                                    1.2,
                                    5.5,
                                    5.0,
                                    3.5,
                                    0,
                                    0,
                                    "lactoză",
                                ],
                                [
                                    "Ciocolată Caldă",
                                    100,
                                    3.0,
                                    2.0,
                                    16.0,
                                    14.0,
                                    2.0,
                                    1,
                                    0.1,
                                    "lactoză, soia, ou",
                                ],
                            ].map((row, i) => (
                                <tr
                                    key={i}
                                    className={
                                        i % 2 === 0 ? "bg-gray-50" : "bg-white"
                                    }
                                >
                                    {row.map((cell, j) => (
                                        <td
                                            key={j}
                                            className="px-3 py-2 whitespace-nowrap"
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-gray-500 italic my-4">
                    * Categoriile Langos și Kurtos provin din produs congelat.
                </p>
                <BackButton />
            </div>
        </SiteLayout>
    );
}
