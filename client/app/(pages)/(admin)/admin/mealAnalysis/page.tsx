"use client"

import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Vendor {
  _id: string;
  name: string;
}

interface MealAnalysis {
  breakfast: number;
  lunch: number;
  dinner: number;
}

const MealAnalysisPage = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedVendor, setSelectedVendor] = useState<string>(''); // Default to 'all' vendors
  
  const [dateToFetch, setDateToFetch] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vendorToFetch, setVendorToFetch] = useState<string>(''); // Vendor to use for fetching
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axiosInstance.get(`/vendor/getVendors`);
        setVendors(response.data.vendor); // Assuming response.data.vendor is an array of vendors
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setError('Failed to fetch vendor list.');
      }
    };
    fetchVendors();
  }, []);

  const fetchMealAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: { date: string; vendorId?: string } = {
        date: dateToFetch
      };
      if (vendorToFetch) { // Only add vendorId if a specific vendor is selected
        params.vendorId = vendorToFetch;
      }
      const response = await axiosInstance.get(`/meal/meal-analysis-by-date`, { params });
      setMealAnalysis(response.data);
    } catch (err) {
      console.error('Error fetching meal analysis:', err);
      setError('Failed to fetch meal analysis data. Please try again.');
      setMealAnalysis(null); // Clear previous data on error
    } finally {
      setLoading(false);
    }
  }, [dateToFetch, vendorToFetch]); // Dependencies changed

  useEffect(() => {
    fetchMealAnalysis();
  }, [fetchMealAnalysis]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleVendorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVendor(event.target.value);
  };

  const handleCheckClick = () => {
    setDateToFetch(selectedDate);
    setVendorToFetch(selectedVendor); // Update vendorToFetch on button click
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">
        Meal Analysis
      </h1>

      <div className="w-full max-w-md mx-auto">
        <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg mb-6">
          <CardHeader className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-[#4facfe] via-[#00f2fe] to-[#7b4dff] bg-clip-text text-transparent">
              Select Filters
            </h2>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row items-end">
                <div className="flex-1">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">Select Date</label>
                  <input
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-base text-white shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="vendor" className="block text-sm font-medium text-gray-300 mb-2">Select Vendor</label>
                  <select
                    id="vendor"
                    name="vendor"
                    value={selectedVendor}
                    onChange={handleVendorChange}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                  >
                    <option value="">All Vendors</option>
                    {vendors.map(vendor => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
            </div>
            <Button onClick={handleCheckClick} disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5">
              Check
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
          <CardHeader className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-[#4facfe] via-[#00f2fe] to-[#7b4dff] bg-clip-text text-transparent">
                  Meal Counts
              </h2>
          </CardHeader>
          <CardContent className="p-6">
              {loading && <p className="text-gray-400">Loading meal analysis...</p>}
              {error && <p className="text-red-500">{error}</p>}

              {!loading && !error && mealAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-md">
                    <CardHeader className="p-4 border-b border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white">Breakfast</h3>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-3xl font-bold text-white">{mealAnalysis.breakfast || 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-md">
                    <CardHeader className="p-4 border-b border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white">Lunch</h3>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-3xl font-bold text-white">{mealAnalysis.lunch || 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-md">
                    <CardHeader className="p-4 border-b border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white">Dinner</h3>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-3xl font-bold text-white">{mealAnalysis.dinner || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              {!mealAnalysis && !loading && !error && dateToFetch && (
                  <p className="text-gray-400">No meal data available for {dateToFetch}.</p>
              )}
              {/* Display loading, error, or no data message within this card content */}
              {(!mealAnalysis && !loading && !error && !dateToFetch) && (
                <p className="text-gray-400">Select a date and click &apos;Check&apos; to view meal analysis.</p>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MealAnalysisPage;