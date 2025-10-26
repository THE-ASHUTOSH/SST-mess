"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import Link from 'next/link';


const Feedback = () => {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const handleStarClick = (selectedRating: number) => {
    setRating(selectedRating)
  }

  const handleStarHover = (hoveredValue: number) => {
    setHoveredRating(hoveredValue)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Submitted feedback:', { rating, feedback })

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/vendorFeedbackForm`;

    const requestBody = JSON.stringify({
      rating: rating,
      feedback: feedback
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // NOTE: If using a native FormData object (for file uploads), 
          // omit 'Content-Type', and pass formData directly as the body.
        },
        body: requestBody,

        credentials: 'include'
      });

      if (!response.ok) {
        // Handle HTTP error statuses (4xx, 5xx)
        // Note: fetch() only throws an error for network failures, not for 4xx/5xx responses
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorData.message || 'Unknown error'}`);
      }

      // Process the successful response
      const data = await response.json();
      setShowSuccessPopup(true);
      console.log('Sucessfully submitted feedback:', data);

    } catch (error) {
      console.error('Unable to submit feedback:', error);
    }


  }

  const renderStar = (value: number) => {
    const isSelected = (hoveredRating || rating) >= value

    return (
      <button
        key={value}
        type="button"
        className={`transform transition-all duration-300 hover:scale-110 focus:outline-none ${isSelected ? 'text-yellow-400' : 'text-gray-600'
          }`}
        onClick={() => handleStarClick(value)}
        onMouseEnter={() => handleStarHover(value)}
        onMouseLeave={() => handleStarHover(0)}
      >
        <svg
          className="w-10 h-10 sm:w-12 sm:h-12"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      </button>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="w-full max-w-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
            Your Feedback
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="block text-center text-gray-300 text-lg mb-4">
                How would you rate your experience?
              </label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map(value => renderStar(value))}
              </div>
              <div className="text-center">
                <span className="text-sm text-gray-400">
                  {rating ? `You rated ${rating} star${rating !== 1 ? 's' : ''}` : 'Click to rate'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-300">
                Additional Comments
              </label>
              <textarea
                id="feedback"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts with us..."
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!rating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 ${rating
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
            >
              Submit Feedback
            </button>
          </form>
        </div>
        {showSuccessPopup && (
          <Link href="/student/dashboard">
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-90 p-4 backdrop-blur-3xl"
              role="alert"
              onClick={() => setShowSuccessPopup(false)}
            >
              <div
                className="relative flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl transform animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Success Icon */}
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

                {/* Message */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Success!
                  </h3>
                  <p className="text-gray-600">
                    Form submitted successfully!
                  </p>
                </div>

                {/* Button */}
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
          </Link>
        )}
      </Card>
    </div>
  )
}

export default Feedback