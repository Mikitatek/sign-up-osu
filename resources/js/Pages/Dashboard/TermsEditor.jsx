import React, { useState } from "react";
import { Inertia } from "@inertiajs/inertia";
import { usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill's default CSS

// Custom toolbar options (optional)
const modules = {
    toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
    ],
};

// Custom formats (optional)
const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "link",
];

export default function TermsEditor() {
    const { flash, terms } = usePage().props;
    const [content, setContent] = useState(terms || "");

    const handleSubmit = (e) => {
        e.preventDefault();
        Inertia.post(route("dashboard.terms.update"), { terms: content });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Edit Terms and Conditions
                </h2>
            }
        >
            <Head title="Terms Editor" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            {/* Display flash success message */}
                            {flash && flash.success && (
                                <div className="mb-4 text-green-600">
                                    {flash.success}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-6">
                                    <label
                                        htmlFor="terms"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Terms and Conditions
                                    </label>

                                    {/* Tailwind-Enhanced ReactQuill */}
                                    <ReactQuill
                                        value={content}
                                        onChange={setContent}
                                        theme="snow"
                                        modules={modules}
                                        formats={formats}
                                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-emerald-700 focus:border-emerald-800 sm:text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                                >
                                    Save
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
