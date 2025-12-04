"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import LoadingSpinner from "@/components/common/LoadingAnimation";
import { useDashboard } from "@/context/DashboardContext";
import LatestVendorCard from "@/components/common/LatestVendorCard";

interface StarRatingProps {
  rating: number;
  onRatingChange: (value: number) => void;
  hoverRating: number;
  onHoverChange: (value: number) => void;
}

interface Ratings {
  hygiene: number;
  quantity: number;
  timeliness: number;
  variety: number;
  staff: number;
  overall: number;
}

const Feedback = () => {
  const { latestSelection, isFeedbackEnabled,loading } = useDashboard();
  const [ratings, setRatings] = useState<Ratings>({
    hygiene: 0,
    quantity: 0,
    timeliness: 0,
    variety: 0,
    staff: 0,
    overall: 0,
  });
  const [hoverRatings, setHoverRatings] = useState<Ratings>({
    hygiene: 0,
    quantity: 0,
    timeliness: 0,
    variety: 0,
    staff: 0,
    overall: 0,
  });
  const [feedback, setFeedback] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (category: string, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleHoverChange = (category: string, value: number) => {
    setHoverRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!latestSelection) return;
    setIsSubmitting(true);

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/vendorFeedbackForm`;
    const requestBody = JSON.stringify({
      vendor: latestSelection.vendor._id,
      ratings,
      feedback: feedback.trim(),
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! Status: ${response.status}. Details: ${errorData.message || "Unknown error"
          }`
        );
      }

      setShowSuccessPopup(true);
    } catch (error) {
      setShowErrorPopup(true);
      console.error("Unable to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackCategories = [
    { id: "hygiene", label: "Rate your vendor's Food Hygiene & Safety" },
    {
      id: "quantity",
      label: "Rate your vendor's Food Quantity & Value for Money",
    },
    { id: "timeliness", label: "Rate your vendor's Timeliness & Reliability" },
    { id: "variety", label: "Rate your vendor's Menu, Variety & Taste" },
    { id: "staff", label: "Rate your vendor's staff behavior" },
    { id: "overall", label: "Rate your overall experience with your vendor" },
  ];

  const isFormComplete =
    Object.values(ratings).every((r) => r > 0) && latestSelection;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
            Your Feedback
          </h1>
          {loading ? (
            <LoadingSpinner />
          ) : latestSelection ? (
            <LatestVendorCard vendorName={latestSelection.vendor.name} />
          ) : (
            <p>No vendor selection found.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 mt-8">
            <div className="space-y-6">
              {feedbackCategories.map(({ id, label }) => (
                <div key={id} className="space-y-3">
                  <label className="block text-center text-gray-300 text-md">
                    {label}
                  </label>
                  <StarRating
                    rating={ratings[id as keyof Ratings]}
                    onRatingChange={(value) => handleRatingChange(id, value)}
                    hoverRating={hoverRatings[id as keyof Ratings]}
                    onHoverChange={(value) => handleHoverChange(id, value)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 animate-fade-in-up">
              <label
                htmlFor="feedback"
                className="block text-sm font-medium text-gray-300"
              >
                Additional Comments
              </label>
              <textarea
                id="feedback"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Please share specific details to help us improve..."
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!isFormComplete || isSubmitting|| !isFeedbackEnabled}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center ${isFormComplete && !isSubmitting
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
            >
              {isSubmitting ? <LoadingSpinner /> : "Submit Feedback"}
            </button>
          </form>
        </div>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-90 p-4 backdrop-blur-3xl"
            onClick={() => setShowSuccessPopup(false)}
          >
            <div
              className="relative flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl transform animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Success!
                </h3>
                <p className="text-gray-600">Form submitted successfully!</p>
              </div>
              <Link href="/student/dashboard">
                <button
                  className="mt-2 px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 active:scale-95 transition-all duration-200 shadow-md"
                  onClick={() => setShowSuccessPopup(false)}
                >
                  OK
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Error Popup */}
        {showErrorPopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-90 p-4 backdrop-blur-3xl"
            onClick={() => setShowErrorPopup(false)}
          >
            <div
              className="relative flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl transform animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Error!
                </h3>
                <p className="text-gray-600">Something went wrong!</p>
              </div>
              <Link href="/student/dashboard">
                <button
                  className="mt-2 px-8 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 active:scale-95 transition-all duration-200 shadow-md"
                  onClick={() => setShowErrorPopup(false)}
                >
                  OK
                </button>
              </Link>
            </div>
          </div>
        )}

      </Card>
    </div>
  );
};

const StarRating = ({
  rating,
  onRatingChange,
  hoverRating,
  onHoverChange,
}: StarRatingProps) => {
  return (
    <div className="flex justify-center space-x-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={`transform transition-all duration-300 hover:scale-110 focus:outline-none ${(hoverRating || rating) >= value
              ? "text-yellow-400"
              : "text-gray-600"
            }`}
          onClick={() => onRatingChange(value)}
          onMouseEnter={() => onHoverChange(value)}
          onMouseLeave={() => onHoverChange(0)}
        >
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default Feedback;
