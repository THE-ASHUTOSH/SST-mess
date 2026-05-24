'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { useQRCode } from 'next-qrcode';
import { isAxiosError } from 'axios';
import { QRSkeleton } from '@/components/common/Skeletons';

const QR_TTL_SECONDS = 30;

const GetFoodPage = () => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QR_TTL_SECONDS);
  const { Canvas } = useQRCode();
  const [qrWidth, setQrWidth] = useState(300);

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const newWidth = screenWidth < 640 ? screenWidth - 40 : 300;
      setQrWidth(newWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchQrCode = useCallback(async () => {
    try {
      setError('');
      const response = await axiosInstance.get(`/api/meal/generate-qr`);
      setToken(response.data.token);
      setSecondsLeft(QR_TTL_SECONDS);
    } catch (err: unknown) {
      setToken('');
      if (isAxiosError(err) && err.response?.status === 403) {
        setError(err.response.data.message);
      } else {
        setError('Error generating QR code. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQrCode();
  }, [fetchQrCode]);

  // Countdown that stops at 0 — user must tap to refresh. Pauses when scanned or errored.
  useEffect(() => {
    if (!token || scanned || error || secondsLeft <= 0) return;

    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, [token, scanned, error, secondsLeft]);

  const expired = !!token && secondsLeft <= 0 && !scanned;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (token && !scanned) {
      interval = setInterval(async () => {
        try {
          const response = await axiosInstance.get(`/api/meal/status`);
          if (response.data.status === 'scanned') {
            setScanned(true);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Error checking meal status:', error);
        }
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [token, scanned]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center pt-10 sm:pt-20 min-h-[calc(100vh-4rem)]">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-10 text-primary tracking-tight">
        {scanned ? 'Enjoy your meal!' : 'Your QR Code'}
      </h1>

      {loading && <QRSkeleton />}

      {error && (
        <div className="text-center p-6 border-2 border-destructive/50 bg-destructive/10 rounded-xl max-w-md animate-in fade-in zoom-in">
          <svg className="w-12 h-12 mx-auto text-destructive mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="text-lg font-medium text-destructive">{error}</p>
        </div>
      )}

      {token && !error && !scanned && (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="relative bg-white p-2 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div
              className={`transition-all duration-300 ${
                expired ? 'blur-md opacity-60' : ''
              }`}
              aria-hidden={expired}
            >
              <Canvas
                text={token}
                options={{
                  errorCorrectionLevel: 'M',
                  margin: 1,
                  scale: 4,
                  width: qrWidth,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                  },
                }}
              />
            </div>
            {expired && (
              <button
                type="button"
                onClick={fetchQrCode}
                aria-label="Refresh expired QR code"
                className="absolute inset-0 flex items-center justify-center rounded-xl cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex items-center justify-center w-20 h-20 rounded-full bg-background/90 border border-border shadow-lg group-hover:bg-background group-hover:scale-110 transition-all">
                  <svg
                    className="w-10 h-10 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.6 5.6L4 8m0 8a8 8 0 0013.4 2.4L20 16"
                    />
                  </svg>
                </span>
              </button>
            )}
          </div>
          {expired ? (
            <p className="mt-6 text-sm font-medium text-destructive" aria-live="polite">
              QR expired — tap the icon to refresh
            </p>
          ) : (
            <p
              className={`mt-6 text-sm font-medium ${
                secondsLeft <= 5 ? 'text-destructive' : 'text-muted-foreground'
              }`}
              aria-live="polite"
            >
              Valid for {secondsLeft}s
            </p>
          )}
          <p className="mt-3 text-muted-foreground text-center max-w-xs">
            Show this QR code to the vendor to collect your food.
          </p>
        </div>
      )}

      {scanned && (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="bg-green-500/20 p-8 rounded-full mb-6">
            <svg className="w-24 h-24 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <p className="text-2xl font-bold text-green-500">Verified!</p>
        </div>
      )}
    </div>
  );
};

export default GetFoodPage;
