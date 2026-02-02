"use client";
import React from 'react';
import EventCard from '@/components/common/EventCard';
import LatestVendorCard from '@/components/common/LatestVendorCard';
import { useDashboard } from '@/context/DashboardContext';
import { VendorCardSkeleton, CardSkeleton } from '@/components/common/Skeletons';
import { Card, CardContent } from '@/components/ui/card';

const Dashboard = () => {
  const { latestSelection, loading, isFeedbackEnabled } = useDashboard();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="h-10 w-48 bg-accent animate-pulse rounded-md mx-auto mb-10" />
        <VendorCardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-10 text-primary tracking-tight transform hover:scale-105 transition-transform duration-300">
        Dashboard
      </h1>
      {latestSelection ? (
        <LatestVendorCard
          vendorName={latestSelection.vendor.name}
        />
      ) : (
        <Card className="bg-muted border-dashed border-2 mb-10">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">You are Opted out for this month</p>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch animate-in fade-in slide-in-from-bottom-6 duration-700">
        <EventCard title="Get your food" redirectUrl="/student/getFood">
          <p> Get the qr for collecting the food </p>
        </EventCard>
        <EventCard title="Menu" redirectUrl="/student/vendorDetails">
          <p>Get the menu of all the vendors here</p>
        </EventCard>
        {/* <EventCard title="Select Vendor" redirectUrl="/student/selectVendor">
          <p>Select the vendor you want to order from</p>
        </EventCard> */}
        <EventCard title="Feedback" redirectUrl="/student/feedback" enabled={isFeedbackEnabled && latestSelection !== null}>
          <p>Your feedback is very important to us</p>
        </EventCard>
      </div>
    </div>
  );
};

export default Dashboard;

