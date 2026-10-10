'use client';

import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import RequireRole from "../RequireRole";
import ScanResultCard from "@/components/common/ScanResultCard";
import CameraPermissionPrompt from "@/components/common/CameraPermissionPrompt";
import { cameraAlreadyGranted, cameraFailureMessage, requestCameraAccess } from "@/lib/camera";

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
  // The scanner only mounts once the operator has accepted the soft prompt (or the browser says
  // permission was already granted) — the camera is never opened behind their back.
  const [cameraReady, setCameraReady] = useState(false);
  const [checkingCamera, setCheckingCamera] = useState(true);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-code-full-region';

  // An operator who already granted the camera shouldn't be asked again on every shift.
  useEffect(() => {
    let active = true;
    cameraAlreadyGranted().then((granted) => {
      if (!active) return;
      setCameraReady(granted);
      setCheckingCamera(false);
    });
    return () => {
      active = false;
    };
  }, []);

  /** The soft prompt's accept: this call is what raises the browser's own dialog. */
  const enableCamera = async () => {
    setRequestingCamera(true);
    setCameraNotice(null);
    try {
      await requestCameraAccess();
      setCameraReady(true);
    } catch (err) {
      console.warn('Camera permission refused:', err);
      setCameraNotice(cameraFailureMessage(err));
    } finally {
      setRequestingCamera(false);
    }
  };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axiosInstance.get(`/api/vendor/getVendors`);
        console.log('Fetched vendors:', response.data.vendors);
        if (Array.isArray(response.data.vendors)) {
          const fetchedVendors: Vendor[] = response.data.vendors;
          const gaurasVendors = fetchedVendors.filter(v => v.name.includes("Gaura's Secret Recipe"));
          const otherVendors = fetchedVendors.filter(v => !v.name.includes("Gaura's Secret Recipe"));

          let finalVendors = fetchedVendors;
          if (gaurasVendors.length > 0) {
            const combinedGauraVendor: Vendor = {
              id: gaurasVendors.map(v => v.id).join(','),
              name: "Gaura's Secret Recipe",
            };
            finalVendors = [combinedGauraVendor, ...otherVendors];
            setVendors(finalVendors);
          } else {
            setVendors(fetchedVendors);
          }

          const savedVendorId = localStorage.getItem('selectedVendorId');
          if (savedVendorId) {
            const vendorExists = finalVendors.some(v => v.id === savedVendorId);
            if (vendorExists) {
              setSelectedVendor(savedVendorId);
            }
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
    if (typeof window === 'undefined' || !selectedVendor || !cameraReady) {
      return;
    }

    const cleanupScanner = async () => {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          // Ignore errors if scanner is not running
          console.warn("Error stopping scanner:", err);
        }
        scannerRef.current = null;
      }
    };

    if (isProcessing) {
      cleanupScanner();
      return;
    }

    const startScanner = async () => {
      if (!scannerRef.current && document.getElementById(scannerContainerId)) {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        try {
          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (navigator.vibrate) {
                try {
                  navigator.vibrate(100);
                } catch (e) {
                  console.error("Vibration failed", e);
                }
              }
              handleVerify(decodedText);
            },
            () => {
              // ignore per-frame decode errors
            }
          );
        } catch (err) {
          // warn, not error: a camera that won't open is a state the prompt below explains, not an
          // app fault — and Next's dev overlay red-flags anything logged as an error.
          console.warn("Camera unavailable:", err);
          // start() never attached to the camera, so drop the instance — otherwise the guard above
          // would see a live ref and skip the next attempt.
          try {
            scanner.clear();
          } catch {
            // nothing was rendered yet
          }
          scannerRef.current = null;
          // Only show error if not processing (processing might cause unmount/stop which throws)
          if (!isProcessing) {
            // Back to the soft prompt, now carrying the reason.
            setCameraNotice(cameraFailureMessage(err));
            setCameraReady(false);
          }
        }
      }
    };

    // Small timeout to ensure DOM is ready and previous instance is cleared
    const timerId = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timerId);
      cleanupScanner();
    };
  }, [isProcessing, selectedVendor, cameraReady]);

  const handleVerify = async (token: string) => {
    if (!selectedVendor) {
      setError('Please select a vendor first.');
      return;
    }
    setIsProcessing(true);
    try {
      const vendorIds = selectedVendor.includes(',') ? selectedVendor.split(',') : [selectedVendor];
      const response = await axiosInstance.post(`/api/meal/verify-qr`, { token, vendorId: vendorIds });
      setMessage(response.data.message || 'Meal verified.');
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
          onValueChange={(value) => {
            setSelectedVendor(value);
            localStorage.setItem('selectedVendorId', value);
          }}
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

      {/* Vendor-fetch failures happen outside a scan, so without their own surface they would be
          set and never shown. */}
      {error && !isProcessing && (
        <div className="mb-8 w-full max-w-sm">
          <ScanResultCard
            variant="error"
            message={error}
            onAction={() => setError('')}
            actionLabel="Dismiss"
          />
        </div>
      )}

      {/* Ask in our own words before the browser's prompt — see CameraPermissionPrompt. */}
      {selectedVendor && !cameraReady && !isProcessing && (
        <div className="mb-8 w-full max-w-sm">
          {checkingCamera ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (
            <CameraPermissionPrompt
              onEnable={enableCamera}
              requesting={requestingCamera}
              notice={cameraNotice}
            />
          )}
        </div>
      )}

      {selectedVendor && cameraReady && (
        <div className="w-full max-w-sm relative" style={{ minHeight: '300px' }}>
          <div id={scannerContainerId} style={{ display: isProcessing ? 'none' : 'block' }} className="rounded-lg overflow-hidden border-2 border-primary/20 bg-black"></div>
          {isProcessing && (
            <div className="flex flex-col items-center justify-center h-full mt-4">
              {message || error ? (
                <ScanResultCard
                  variant={error ? 'error' : 'success'}
                  message={error || message}
                  user={verifiedUser}
                  onAction={resetScanner}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <p className="text-lg font-semibold animate-pulse">Please wait…</p>
                  <p className="text-sm text-muted-foreground">Verifying details</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GuardedVerifyStudentQRPage = () => (
  <RequireRole roles={["superAdmin"]}>
    <VerifyStudentQRPage />
  </RequireRole>
);

export default GuardedVerifyStudentQRPage;