'use client';

import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Button } from "@/components/ui/button";

interface VerifiedUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface Vendor {
  id: string;
  name: string;
}

const VerifyStudentQRPage = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerId = 'qr-code-full-region';

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axiosInstance.get(`/api/vendor/getVendors`);
        if (Array.isArray(response.data.vendors)) {
          const fetchedVendors: Vendor[] = response.data.vendors;
          const gaurasVendors = fetchedVendors.filter(v => v.name.includes("Gaura's Secret Recipe"));
          const otherVendors = fetchedVendors.filter(v => !v.name.includes("Gaura's Secret Recipe"));

          if (gaurasVendors.length > 0) {
            const combinedGauraVendor: Vendor = {
              id: gaurasVendors.map(v => v.id).join(','),
              name: "Gaura's Secret Recipe",
            };
            setVendors([combinedGauraVendor, ...otherVendors]);
          } else {
            setVendors(fetchedVendors);
          }
        } else {
          setError('Failed to fetch vendors: Invalid data format.');
        }
      } catch (err) {
        setError('Failed to fetch vendors.');
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedVendor) {
      return;
    }

    if (isProcessing) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Error clearing scanner:", err));
        scannerRef.current = null;
      }
      return;
    }

    if (!scannerRef.current && document.getElementById(scannerContainerId)) {
      const scanner = new Html5QrcodeScanner(
        scannerContainerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [],
        },
        false
      );

      const onScanSuccess = (decodedText: string) => {
        if (navigator.vibrate) {
          try {
            navigator.vibrate(300);
          } catch (e) {
            console.error("Vibration failed", e);
          }
        }
        handleVerify(decodedText);
      };

      const onScanFailure = (errorMessage: string) => {
        // ignore
      };

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Error clearing scanner on unmount:", err));
        scannerRef.current = null;
      }
    };
  }, [isProcessing, selectedVendor]);

  const handleVerify = async (token: string) => {
    if (!selectedVendor) {
      setError('Please select a vendor first.');
      return;
    }
    setIsProcessing(true);
    try {
      // const response = await axiosInstance.post(`/meal/verify-qr`, { token, vendorId: selectedVendor });
      const vendorIds = selectedVendor.includes(',') ? selectedVendor.split(',') : [selectedVendor];
      const response = await axiosInstance.post(`/api/meal/verify-qr`, { token, vendorId: vendorIds });
      // console.log('Meal verified:', response.data);
      setMessage(`Meal verified for ${response.data.user.name}.`);
      setVerifiedUser(response.data.user);
      setError('');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Error verifying QR code. Please try again later.';
        setError(errorMessage);
      }
      setMessage('');
    }
  };

  const resetScanner = () => {
    setMessage('');
    setError('');
    setIsProcessing(false);
    setVerifiedUser(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center pt-10 sm:pt-20 min-h-[calc(100vh-4rem)]">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-10 text-primary tracking-tight">
        Verify Student QR
      </h1>

      <div className="mb-8 w-full max-w-sm space-y-4">
        <Label htmlFor="vendor-select" className="text-base">Select Vendor</Label>
        <Select
          value={selectedVendor}
          onValueChange={setSelectedVendor}
          disabled={isProcessing}
        >
          <SelectTrigger id="vendor-select" className="w-full">
            <SelectValue placeholder="-- Please choose a vendor --" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedVendor && (
        <div className="w-full max-w-sm relative" style={{ minHeight: '300px' }}>
          <div id={scannerContainerId} style={{ display: isProcessing ? 'none' : 'block' }} className="rounded-lg overflow-hidden border-2 border-primary/20 bg-black"></div>
          {isProcessing && (
            <div className="flex flex-col items-center justify-center h-full mt-4 animate-in fade-in zoom-in duration-300">
              {verifiedUser ? (
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <img src={verifiedUser.picture} alt={verifiedUser.name} className="w-32 h-32 mx-auto rounded-full border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" referrerPolicy='no-referrer' />
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-2 border-4 border-background">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold">{verifiedUser.name}</h3>
                    <p className="text-green-500 text-lg font-medium">{message}</p>
                  </div>
                  <Button onClick={resetScanner} size="lg" className="w-full">Scan Again</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  {message && <p className="text-green-500 text-xl text-center font-medium">{message}</p>}
                  {error && (
                    <div className="text-red-500 text-center space-y-2">
                      <svg className="w-12 h-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-xl font-medium">{error}</p>
                    </div>
                  )}
                  {/* PLEASE WAIT STATE */}
                  {!message && !error && (
                    <div className="flex flex-col items-center gap-4">
                      <Skeleton className="h-32 w-32 rounded-full" />
                      <p className="text-xl font-semibold animate-pulse text-muted-foreground">Please wait...</p>
                      <p className="text-sm text-muted-foreground">Verifying details</p>
                    </div>
                  )}
                  {(message || error) && <Button onClick={resetScanner} size="lg" className="w-full">Scan Again</Button>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyStudentQRPage;