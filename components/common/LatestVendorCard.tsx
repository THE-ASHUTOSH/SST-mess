"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LatestVendorCard = ({ vendorName }: { vendorName: string }) => {
  return (
    <Card className="mb-4 bg-card text-card-foreground rounded-xl border border-border/60 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Your Latest Vendor Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg text-muted-foreground">
          You selected <strong className="text-primary font-semibold">{vendorName}</strong>.
        </p>
      </CardContent>
    </Card>
  );
};

export default LatestVendorCard;
