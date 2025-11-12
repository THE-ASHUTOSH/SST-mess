"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingAnimation from "@/components/common/LoadingAnimation";

interface Vendor {
  _id: string;
  name: string;
  description: string;
  price: number;
  menu: string;
}

interface Feedback {
  _id: string;
  vendor: Vendor;
  user: string;
  feedback: string;
  ratings: {
    hygiene: number;
    quantity: number;
    timeliness: number;
    variety: number;
    staff: number;
    overall: number;
  };
  date: string;
}

const FeedbackAnalysis = () => {
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedRating, setSelectedRating] = useState<string>("");
  const [selectedChart, setSelectedChart] = useState<string>("overall");

  useEffect(() => {
    const fetchFeedbackData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/getFeedbackAnalysis`);
        if (!res.ok) {
          throw new Error("Failed to fetch feedback analysis data");
        }
        const data = await res.json();
        setFeedbackData(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackData();
  }, []);

  const vendors = Array.from(new Set(feedbackData.map(f => f.vendor?.name).filter(Boolean)));

  const filteredFeedback = feedbackData.filter(feedback => {
    const vendorMatch = !selectedVendor || feedback.vendor?.name === selectedVendor;
    const ratingMatch = !selectedRating || feedback.ratings.overall === parseInt(selectedRating, 10);
    return vendorMatch && ratingMatch;
  });

  const getChartData = () => {
    const vendorRatings: { [key: string]: { totalRating: number; count: number } } = {};
    filteredFeedback.forEach((feedback) => {
      if (feedback.vendor) {
        const vendorName = feedback.vendor.name;
        if (!vendorRatings[vendorName]) {
          vendorRatings[vendorName] = { totalRating: 0, count: 0 };
        }
        vendorRatings[vendorName].totalRating += feedback.ratings[selectedChart as keyof typeof feedback.ratings];
        vendorRatings[vendorName].count += 1;
      }
    });

    return Object.keys(vendorRatings).map((vendorName) => ({
      name: vendorName,
      averageRating: vendorRatings[vendorName].totalRating / vendorRatings[vendorName].count,
    }));
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  const chartData = getChartData();

  return (
    <div className="min-h-[80vh] flex flex-col items-center p-4 bg-gray-900 text-white animate-fade-in-up">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
          Feedback Analysis
        </h1>

        <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="vendor-filter" className="block text-sm font-medium text-gray-300 mb-2">Vendor</label>
              <select
                id="vendor-filter"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white"
              >
                <option value="">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
              <select
                id="rating-filter"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white"
              >
                <option value="">All Ratings</option>
                {[5, 4, 3, 2, 1].map(rating => (
                  <option key={rating} value={rating}>{rating} Star{rating > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="chart-filter" className="block text-sm font-medium text-gray-300 mb-2">Chart</label>
              <select
                id="chart-filter"
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white"
              >
                <option value="overall">Overall</option>
                <option value="hygiene">Hygiene</option>
                <option value="quantity">Quantity</option>
                <option value="timeliness">Timeliness</option>
                <option value="variety">Variety</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Average Vendor Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="name" tick={{ fill: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#E2E8F0' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                    <Legend wrapperStyle={{ color: '#E2E8F0' }}/>
                    <Bar dataKey="averageRating" fill="url(#colorRating)" />
                    <defs>
                      <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400">No feedback data available for the selected filters.</p>
              )}
            </CardContent>
          </Card>

          <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">All Feedback</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[400px] text-white">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-800/80 backdrop-blur-sm">
                  <tr>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Vendor</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Hygiene</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Quantity</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Timeliness</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Variety</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Staff</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Overall</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Feedback</th>
                    <th className="py-2 px-4 border-b border-gray-700 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredFeedback.length > 0 ? (
                    filteredFeedback.map((feedback) => (
                      <tr key={feedback._id}>
                        <td className="py-2 px-4">{feedback.vendor ? feedback.vendor.name : "Vendor not found"}</td>
                        <td className="py-2 px-4">{feedback.ratings.hygiene}</td>
                        <td className="py-2 px-4">{feedback.ratings.quantity}</td>
                        <td className="py-2 px-4">{feedback.ratings.timeliness}</td>
                        <td className="py-2 px-4">{feedback.ratings.variety}</td>
                        <td className="py-2 px-4">{feedback.ratings.staff}</td>
                        <td className="py-2 px-4">{feedback.ratings.overall}</td>
                        <td className="py-2 px-4">{feedback.feedback}</td>
                        <td className="py-2 px-4">{new Date(feedback.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-gray-400">No feedback submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeedbackAnalysis;