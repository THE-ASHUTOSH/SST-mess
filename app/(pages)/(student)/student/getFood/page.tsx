'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { useQRCode } from 'next-qrcode';
import { isAxiosError } from 'axios';
import { QRSkeleton } from '@/components/common/Skeletons';

const GetFoodPage = () => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
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

  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        const response = await axiosInstance.get(`/api/meal/generate-qr`);
        setToken(response.data.token);
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.status === 403) {
          setError(err.response.data.message);
        } else {
          setError('Error generating QR code. Please try again later.');
        }
      }
      setLoading(false);
    };

    fetchQrCode();
  }, []);

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
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-primary tracking-tight">
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
          <div className="bg-white p-2 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
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
          <p className="mt-8 text-muted-foreground text-center max-w-xs animate-pulse">
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
