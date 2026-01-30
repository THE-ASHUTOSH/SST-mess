"use client";
import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/common/Skeletons";
import axiosInstance from '@/lib/axiosInstance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchChoiceData = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.post(`/api/vendor/choice-analysis`, { month, year });
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
    return <div className="p-8 max-w-4xl mx-auto"><TableSkeleton rows={6} /></div>;
  }

  if (error) {
    return <div className="text-destructive text-center mt-10">{error}</div>;
  }

  const chartData = getChartData();
  const COLORS = ["oklch(0.6 0.118 184.704)", "oklch(0.646 0.222 41.116)", "oklch(0.828 0.189 84.429)", "oklch(0.769 0.188 70.08)"];

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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-center text-primary">
          Choice Analysis
        </h1>

        <div className="flex justify-center gap-4">
          <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="w-full border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Vendor Selections</CardTitle>
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
                      backgroundColor: 'oklch(0.12 0 0)',
                      borderColor: 'oklch(0.2 0 0)',
                      color: 'oklch(0.985 0 0)',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: 'inherit' }}
                  />
                  <Legend wrapperStyle={{ color: 'oklch(0.705 0 0)' }} />
                </PieChart>
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