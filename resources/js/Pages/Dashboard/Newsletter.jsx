import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage } from "@inertiajs/react";
import { Inertia } from "@inertiajs/inertia"; // Correct import for Inertia.js
import { useState } from "react";

export default function Newsletter() {
    const { signups } = usePage().props; // Get the signups from props
    const [deleting, setDeleting] = useState(null); // Track which signup is being deleted

    const handleDelete = (id) => {
        // Show confirmation dialog
        if (window.confirm("Are you sure you want to delete this signup?")) {
            Inertia.delete(`/dashboard/newsletter/${id}`, {
                onBefore: () => setDeleting(id), // Set the deleting state to the current id
                onFinish: () => setDeleting(null), // Reset after deletion
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Newsletter Management
                </h2>
            }
        >
            <Head title="Newsletter" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-md sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h3 className="text-lg font-bold mb-4">
                                Signed-Up Users
                            </h3>

                            {/* Check if there are any signups */}
                            {signups.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full table-auto">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-2 text-left">
                                                    Name
                                                </th>
                                                <th className="px-4 py-2 text-left">
                                                    Email
                                                </th>
                                                <th className="px-4 py-2 text-left">
                                                    Phone
                                                </th>
                                                <th className="px-4 py-2 text-center">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {signups.map((signup) => (
                                                <tr
                                                    key={signup.id}
                                                    className="border-b hover:bg-gray-50"
                                                >
                                                    <td className="border px-4 py-2">
                                                        {signup.name}
                                                    </td>
                                                    <td className="border px-4 py-2">
                                                        {signup.email}
                                                    </td>
                                                    <td className="border px-4 py-2">
                                                        {signup.phone}
                                                    </td>
                                                    <td className="border px-4 py-2 text-center">
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    signup.id
                                                                )
                                                            }
                                                            className={`text-red-600 hover:text-red-800 font-bold transition duration-150 ease-in-out ${
                                                                deleting ===
                                                                signup.id
                                                                    ? "opacity-50 cursor-not-allowed"
                                                                    : ""
                                                            }`}
                                                            disabled={
                                                                deleting ===
                                                                signup.id
                                                            } // Disable button while deleting
                                                        >
                                                            {deleting ===
                                                            signup.id
                                                                ? "Deleting..."
                                                                : "X"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500">No signups yet!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
