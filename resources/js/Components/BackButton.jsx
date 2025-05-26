export default function BackButton() {
    const handleBackClick = () => {
        // Check if there is a history entry to go back to
        if (window.history.length > 1) {
            window.history.back(); // Navigate back to the previous page
        } else {
            window.location.reload(); // Refresh the page if there's no history
        }
    };

    return (
        <div className="flex items-center">
            <button
                onClick={handleBackClick} // Use the new click handler
                className="flex items-center text-emerald-800 hover:text-emerald-600 focus:outline-none"
            >
                {/* Small back arrow SVG icon */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
                <span className="text-lg">Înapoi</span>
            </button>
        </div>
    );
}
