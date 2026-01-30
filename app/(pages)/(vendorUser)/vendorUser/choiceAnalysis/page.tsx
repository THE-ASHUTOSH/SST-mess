"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/common/Skeletons";
import axiosInstance from '@/lib/axiosInstance';

interface Vendor {
  id: string;
  name: string;
  description: string;
  price: number;
  menu: string;
}

interface Choice {
  id: string;
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
        const res = await axiosInstance.get(`/api/vendor/choice-analysis`);
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
    return <div className="p-8 max-w-4xl mx-auto"><TableSkeleton rows={6} /></div>;
  }

  if (error) {
    return <div className="text-destructive text-center mt-10">{error}</div>;
  }

  const chartData = getChartData();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-center text-primary">
          Choice Analysis
        </h1>
        <Card className="w-full border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Vendor Selections</CardTitle>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                  <XAxis dataKey="name" tick={{ fill: 'oklch(0.705 0 0)' }} />
                  <YAxis tick={{ fill: 'oklch(0.705 0 0)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.12 0 0)',
                      borderColor: 'oklch(0.2 0 0)',
                      color: 'oklch(0.985 0 0)',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: 'inherit' }}
                  />
                  <Legend wrapperStyle={{ color: 'oklch(0.705 0 0)' }} />
                  <Bar dataKey="count" fill="oklch(0.646 0.222 41.116)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground">No choice data available to display.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChoiceAnalysis;