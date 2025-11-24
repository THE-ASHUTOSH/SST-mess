"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import Link from 'next/link';
import LoadingAnimation from '@/components/common/LoadingAnimation';

const AddVendor = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    menuUrl: ''
  });
  const [mealsOptions, setMealsOptions] = useState({
    breakfast: true,
    lunch: true,
    dinner: true
  });
  const [menuFile, setMenuFile] = useState<File | null>(null);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMealsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setMealsOptions(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMenuFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/addVendor`;
      
      const requestBody = new FormData();
      requestBody.append('name', formData.name);
      requestBody.append('description', formData.description);
      requestBody.append('price', formData.price);
      requestBody.append('menuUrl', formData.menuUrl);
      requestBody.append('mealsOptions', JSON.stringify(mealsOptions));
      if (menuFile) {
        requestBody.append('menuFile', menuFile);
      }

      const response = await fetch(url, {
        method: 'POST',
        body: requestBody,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorData.message || 'Unknown error'}`);
      }

      setShowSuccessPopup(true);
    } catch (error) {
      setShowErrorPopup(true);
      console.error('Fetch operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
            Add New Vendor
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-300">
                Vendor Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter vendor name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter vendor description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium text-gray-300">
                Price
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter price"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Allowed Meals</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    name="breakfast"
                    checked={mealsOptions.breakfast}
                    onChange={handleMealsChange}
                    className="form-checkbox h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span>Breakfast</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    name="lunch"
                    checked={mealsOptions.lunch}
                    onChange={handleMealsChange}
                    className="form-checkbox h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span>Lunch</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    name="dinner"
                    checked={mealsOptions.dinner}
                    onChange={handleMealsChange}
                    className="form-checkbox h-5 w-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span>Dinner</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="menuUrl" className="text-sm font-medium text-gray-300">
                Menu URL
              </label>
              <textarea
                id="menuUrl"
                name="menuUrl"
                value={formData.menuUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter menu URL"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="menuFile" className="text-sm font-medium text-gray-300">
                Menu File
              </label>
              <input
                type="file"
                id="menuFile"
                name="menuFile"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 transition-all duration-300"
                accept=".csv"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? <LoadingAnimation /> : 'Add Vendor'}
            </button>
          </form>
        </div>
        {showSuccessPopup && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-90 p-4 backdrop-blur-3xl"
              role="alert"
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
                  <p className="text-gray-600">
                    Vendor added successfully!
                  </p>
                </div>
                <Link href="/admin/dashboard">
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

        {showErrorPopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-90 p-4 backdrop-blur-3xl"
            role="alert"
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
                <p className="text-gray-600">
                  Something went wrong!
                </p>
              </div>
              <Link href="/admin/dashboard">
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
  )
}

export default AddVendor
