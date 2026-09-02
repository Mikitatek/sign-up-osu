import { Head } from "@inertiajs/react";
import BackButton from "@/Components/BackButton";
import SiteLayout from "@/Layouts/SiteLayout";

/** Shared shell + typography for the static legal pages. */
export default function LegalPage({ title, updated, children }) {
    return (
        <SiteLayout>
            <Head title={title} />
            <div className="mx-4 my-10 max-w-3xl rounded-lg p-6 pt-24 md:mx-auto md:px-8">
                <BackButton />

                <h1 className="mt-4 text-2xl font-bold text-gray-900">
                    {title}
                </h1>
                {updated && (
                    <p className="mt-1 text-xs text-gray-500">
                        Ultima actualizare: {updated}
                    </p>
                )}

                <div className="legal-content mt-6 space-y-4 text-sm leading-relaxed text-gray-700 [&_a]:font-medium [&_a]:text-emerald-800 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-gray-900 [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:p-2 [&_th]:text-left">
                    {children}
                </div>

                <BackButton className="mt-8" />
            </div>
        </SiteLayout>
    );
}
