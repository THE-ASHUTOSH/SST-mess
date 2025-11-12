"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LatestVendorCard = ({ vendorName, date }: { vendorName: string; date: string }) => {
  return (
    <Card className="mb-4 bg-transparent text-white rounded-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#4facfe] via-[#00f2fe] to-[#7b4dff] bg-clip-text text-transparent">Your Latest Vendor Selection</CardTitle>
      </CardHeader>
      <CardContent className='bg-gradient-to-r from-[#4facfe] via-[#00f2fe] to-[#7b4dff] bg-clip-text text-transparent'>
        <p className="text-lg">
          You selected <strong>{vendorName}</strong> on {new Date(date).toLocaleDateString()}.
        </p>
      </CardContent>
    </Card>
  );
};

export default LatestVendorCard;
