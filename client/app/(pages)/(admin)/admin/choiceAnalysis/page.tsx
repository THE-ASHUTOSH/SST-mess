"use client";
import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingAnimation from "@/components/common/LoadingAnimation";
import axiosInstance from "../../../../../../lib/axiosInstance";

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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchChoiceData = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.post(`/vendor/getChoiceAnalysis`, { month, year });
        setChoiceData(res.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchChoiceData();
  }, [month, year]);

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
      value: vendorCounts[vendorName],
    }));
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  const chartData = getChartData();
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const {
        cx = 0,
        cy = 0,
        midAngle = 0,
        innerRadius = 0,
        outerRadius = 0,
        percent = 0,
        value = 0
    } = props;

    if (!cx || !cy) return null;

    const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.5;
    const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
    const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > (cx as number) ? 'start' : 'end'} dominantBaseline="central">
        {`${((percent as number) * 100).toFixed(0)}% (${value})`}
      </text>
    );
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-900 text-white animate-fade-in-up">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
          Choice Analysis
        </h1>

        <div className="flex justify-center gap-4 mb-4">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m-1).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
        </div>

        <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Vendor Selections</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(31, 41, 55, 0.8)',
                      borderColor: '#4A5568',
                      color: 'white',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#E2E8F0' }}/>
                </PieChart>
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