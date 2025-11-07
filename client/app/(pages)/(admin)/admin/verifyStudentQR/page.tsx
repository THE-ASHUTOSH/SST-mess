'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

const VerifyStudentQRPage = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();

    const startScanning = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          controlsRef.current = await codeReader.decodeFromStream(stream, videoRef.current, (result, err) => {
            if (result) {
              handleVerify(result.getText());
            }
            if (err) {
              // You can choose to handle errors here, e.g., if no QR code is found
            }
          });
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Error accessing camera. Please make sure you have a camera connected and have granted permission.');
      }
    };

    startScanning();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  const handleVerify = async (token: string) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meal/verify-qr`, { token }, { withCredentials: true });
      setMessage(response.data.message);
      setError('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error verifying QR code. Please try again later.');
      }
      setMessage('');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Verify Student QR</h1>
      <div className="w-full max-w-sm">
        <video ref={videoRef} className="w-full border-2 border-gray-300 rounded-lg" />
        {message && <p className="text-green-500 mt-4">{message}</p>}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default VerifyStudentQRPage;