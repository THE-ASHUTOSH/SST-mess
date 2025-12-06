"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingAnimation from "@/components/common/LoadingAnimation";
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';

interface Vendor {
  _id: string;
  name: string;
  description: string;
  price: number;
  menu: string;
}

interface Choice {
  _id: string;
  name: string;
  user: string;
  roomNo: string;
  vendor: Vendor;
  date: string;
}

const ChoiceAnalysis = () => {
  const [choiceData, setChoiceData] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChoiceData = async () => {
      try {
        const res = await axiosInstance.get(`/vendor/getChoiceAnalysis`);
        setChoiceData(res.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchChoiceData();
  }, []);

  const getChartData = () => {
    const vendorCounts: { [key: string]: number } = {};
    choiceData.forEach((choice) => {
      if (choice.vendor) {
        const vendorName = choice.vendor.name;
        vendorCounts[vendorName] = (vendorCounts[vendorName] || 0) + 1;
      }
    });

    return Object.keys(vendorCounts).map((vendorName) => ({
      name: vendorName,
      count: vendorCounts[vendorName],
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-900 text-white animate-fade-in-up">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
          Choice Analysis
        </h1>
        <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Vendor Selections</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis dataKey="name" tick={{ fill: '#E2E8F0' }} />
                  <YAxis tick={{ fill: '#E2E8F0' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(31, 41, 55, 0.8)',
                      borderColor: '#4A5568',
                      color: '#E2E8F0',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#E2E8F0' }}/>
                  <Bar dataKey="count" fill="url(#colorUv)" />
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400">No choice data available to display.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChoiceAnalysis;