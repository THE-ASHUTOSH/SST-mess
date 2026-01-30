"use client";
import React, { useState } from "react";
import axiosInstance from '@/lib/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/context/DashboardContext";
import LatestVendorCard from "@/components/common/LatestVendorCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { Star } from "lucide-react";

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
  const router = useRouter();
  const { latestSelection, isFeedbackEnabled, loading } = useDashboard();
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

    try {
      await axiosInstance.post("/api/vendor/vendorFeedbackForm", {
        vendor: latestSelection.vendor.id,
        ratings,
        feedback: feedback.trim(),
      });
      toast.success("Feedback submitted successfully!", {
        description: "Thank you for your feedback.",
      });
      setTimeout(() => router.push("/student/dashboard"), 1500);
    } catch (error) {
      toast.error("Unable to submit feedback. Please try again later.");
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <Card className="w-full max-w-2xl border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">
            Your Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Skeleton className="h-20 w-full" /></div>
          ) : latestSelection ? (
            <LatestVendorCard vendorName={latestSelection.vendor.name} />
          ) : (
            <p className="text-center text-muted-foreground">No vendor selection found.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 mt-8">
            <div className="space-y-6">
              {feedbackCategories.map(({ id, label }) => (
                <div key={id} className="space-y-3">
                  <Label className="block text-center text-base font-medium text-foreground">
                    {label}
                  </Label>
                  <StarRating
                    rating={ratings[id as keyof Ratings]}
                    onRatingChange={(value) => handleRatingChange(id, value)}
                    hoverRating={hoverRatings[id as keyof Ratings]}
                    onHoverChange={(value) => handleHoverChange(id, value)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Additional Comments</Label>
              <Textarea
                id="feedback"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Please share specific details to help us improve..."
                className="resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={!isFormComplete || isSubmitting || !isFeedbackEnabled}
              className={`w-full ${isFormComplete && !isSubmitting ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" : ""}`}
            >
              {isSubmitting ? <Skeleton className="h-5 w-24" /> : "Submit Feedback"}
            </Button>
          </form>
        </CardContent>
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
          className="focus:outline-none transition-transform hover:scale-110"
          onClick={() => onRatingChange(value)}
          onMouseEnter={() => onHoverChange(value)}
          onMouseLeave={() => onHoverChange(0)}
        >
          <Star
            className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-200 ${(hoverRating || rating) >= value
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground"
              }`}
          />
        </button>
      ))}
    </div>
  );
};

export default Feedback;
