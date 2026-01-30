"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/common/Skeletons";
import axiosInstance from '@/lib/axiosInstance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Vendor {
  id: string;
  name: string;
  description: string;
  price: number;
  menu: string;
}

interface Feedback {
  id: string;
  vendor: Vendor;
  user: string;
  feedback: string;
  hygiene: number;
  quantity: number;
  timeliness: number;
  variety: number;
  staff: number;
  overall: number;
  date: string;
}

const FeedbackAnalysis = () => {
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedChart, setSelectedChart] = useState<string>("overall");

  useEffect(() => {
    const fetchFeedbackData = async () => {
      try {
        const res = await axiosInstance.get(`/api/vendor/feedback-analysis`);
        setFeedbackData(res.data.data || []);
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
    const vendorMatch = selectedVendor === "all" || feedback.vendor?.name === selectedVendor;
    const ratingMatch = selectedRating === "all" || feedback.overall === parseInt(selectedRating, 10);
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
        vendorRatings[vendorName].totalRating += feedback[selectedChart as 'overall' | 'hygiene' | 'quantity' | 'timeliness' | 'variety' | 'staff'];
        vendorRatings[vendorName].count += 1;
      }
    });

    return Object.keys(vendorRatings).map((vendorName) => ({
      name: vendorName,
      averageRating: vendorRatings[vendorName].totalRating / vendorRatings[vendorName].count,
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center p-4">
      <div className="w-full max-w-6xl space-y-8">
        <h1 className="text-3xl font-bold text-center text-primary">
          Feedback Analysis
        </h1>

        <Card className="w-full border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="vendor-filter">Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger id="vendor-filter">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="rating-filter">Rating</Label>
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger id="rating-filter">
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  {[5, 4, 3, 2, 1].map(rating => (
                    <SelectItem key={rating} value={rating.toString()}>{rating} Star{rating > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="chart-filter">Chart Metric</Label>
              <Select value={selectedChart} onValueChange={setSelectedChart}>
                <SelectTrigger id="chart-filter">
                  <SelectValue placeholder="Overall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="hygiene">Hygiene</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="timeliness">Timeliness</SelectItem>
                  <SelectItem value="variety">Variety</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="w-full border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle>Average Vendor Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                    <Bar dataKey="averageRating" fill="oklch(0.646 0.222 41.116)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground">No feedback data available for the selected filters.</p>
              )}
            </CardContent>
          </Card>

          <Card className="w-full border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle>All Feedback</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <div className="h-full overflow-auto rounded-md border text-card-foreground">
                <Table>
                  <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Hygiene</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Var</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedback.length > 0 ? (
                      filteredFeedback.map((feedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell className="font-medium">{feedback.vendor ? feedback.vendor.name : "Unknown"}</TableCell>
                          <TableCell>{feedback.hygiene}</TableCell>
                          <TableCell>{feedback.quantity}</TableCell>
                          <TableCell>{feedback.timeliness}</TableCell>
                          <TableCell>{feedback.variety}</TableCell>
                          <TableCell>{feedback.staff}</TableCell>
                          <TableCell>{feedback.overall}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={feedback.feedback}>{feedback.feedback}</TableCell>
                          <TableCell>{new Date(feedback.date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                          No feedback submitted yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeedbackAnalysis;
