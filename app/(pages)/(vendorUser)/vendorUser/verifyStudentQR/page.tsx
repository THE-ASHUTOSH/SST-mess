'use client';

import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from "lucide-react";
import ScanResultCard from "@/components/common/ScanResultCard";
import CameraPermissionPrompt from "@/components/common/CameraPermissionPrompt";
import { cameraAlreadyGranted, cameraFailureMessage, requestCameraAccess } from "@/lib/camera";

interface VerifiedUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface MyVendor {
  id: string;
  name: string;
}

const VerifyStudentQRPage = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [myVendor, setMyVendor] = useState<MyVendor | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  // The scanner only mounts once the operator has accepted the soft prompt (or the browser says
  // permission was already granted) — the camera is never opened behind their back.
  const [cameraReady, setCameraReady] = useState(false);
  const [checkingCamera, setCheckingCamera] = useState(true);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // html5-qrcode fires onSuccess on every decoded frame until stop() lands, so one QR can call
  // handleVerify several times. A ref (not state) blocks the repeats synchronously — otherwise the
  // duplicate's "already taken" 403 can land after, and overwrite, the real success.
  const verifyingRef = useRef(false);
  // The last QR this device verified. After "Scan Again" the previous student's code is still on
  // their screen (valid 30s; their page flips to "Verified" only on its next 5s poll), so it gets
  // read again — and its "already taken" shows while the NEXT student is at the counter.
  const verifiedTokenRef = useRef<string | null>(null);
  const scannerContainerId = 'qr-code-full-region';

  // A vendor who already granted the camera shouldn't be asked again on every shift.
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

  // Resolve which vendor this account is scanning for (server-mapped from the login email).
  useEffect(() => {
    const loadMyVendor = async () => {
      try {
        const response = await axiosInstance.get(`/api/vendor/my-vendor`);
        setMyVendor(response.data.vendor ?? null);
      } catch {
        setError('Failed to load your vendor.');
      } finally {
        setLoadingVendor(false);
      }
    };
    loadMyVendor();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !myVendor || !cameraReady) {
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
  }, [isProcessing, myVendor, cameraReady]);

  const handleVerify = async (token: string) => {
    if (verifyingRef.current || token === verifiedTokenRef.current) return;
    if (!myVendor) {
      setError('No vendor is linked to your account.');
      return;
    }
    verifyingRef.current = true;
    setIsProcessing(true);
    try {
      // The server pins the scan to THIS vendor account (from the session), so we don't send a
      // vendorId — a client-supplied one would be ignored for vendor accounts anyway.
      const response = await axiosInstance.post(`/api/meal/verify-qr`, { token });
      verifiedTokenRef.current = token;
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
    verifyingRef.current = false;
    setMessage('');
    setError('');
    setIsProcessing(false);
    setVerifiedUser(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center pt-10 sm:pt-20 min-h-[calc(100vh-4rem)]">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-6 text-primary tracking-tight">
        Verify Student QR
      </h1>

      {/* Which vendor this account scans for (fixed — set by an admin, not chosen here). */}
      <div className="mb-8 w-full max-w-sm">
        {loadingVendor ? (
          <Skeleton className="h-14 w-full rounded-xl" />
        ) : myVendor ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <Store className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Scanning for</p>
              <p className="truncate text-base font-semibold text-foreground">{myVendor.name}</p>
            </div>
          </div>
        ) : (
          // Setup state, not a scan result: theme tokens so it tracks light/dark.
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-center">
            <p className="text-sm font-medium text-foreground">
              {error || 'No vendor is linked to your account.'}
            </p>
            {!error && (
              <p className="text-xs text-muted-foreground">
                Ask an admin to set your vendor&apos;s login email.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ask in our own words before the browser's prompt — see CameraPermissionPrompt. */}
      {myVendor && !cameraReady && !isProcessing && (
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

      {myVendor && cameraReady && (
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

export default VerifyStudentQRPage;
