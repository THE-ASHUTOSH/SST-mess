'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { useQRCode } from 'next-qrcode';
import { isAxiosError } from 'axios';

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
      // sm breakpoint is 640px. Below that, we want it to be responsive.
      // The container has p-4 (1rem padding on each side), so 2rem total.
      // Let's give it a bit more margin, say 2.5rem (40px) total from screen edges.
      const newWidth = screenWidth < 640 ? screenWidth - 40 : 300;
      setQrWidth(newWidth);
    };

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        const response = await axiosInstance.get(`/meal/generate-qr`);
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
          const response = await axiosInstance.get(`/meal/status`);
          if (response.data.status === 'scanned') {
            setScanned(true);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Error checking meal status:', error);
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [token, scanned]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">
        {scanned ? 'Enjoy your meal!' : 'Your QR Code'}
      </h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {token && !error && !scanned && (
        <div className="flex flex-col items-center">
          <Canvas
            text={token}
            options={{
              errorCorrectionLevel: 'M',
              margin: 3,
              scale: 4,
              width: qrWidth,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            }}
          />
          <p className="mt-4 text-gray-500">Scan this QR code to get your food.</p>
        </div>
      )}
    </div>
  );
};

export default GetFoodPage;
