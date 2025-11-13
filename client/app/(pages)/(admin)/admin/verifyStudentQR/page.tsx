'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LoadingAnimation from '@/components/common/LoadingAnimation';

const VerifyStudentQRPage = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);


  useEffect(() => {
    // Do not run on server
    if (typeof window === 'undefined') {
      return;
    }

    if (isProcessing) {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      return;
    }

    if (scannerRef.current) {scannerRef.current.clear()
      return; // Scanner already running
    }

    // The scanner instance is created and stored in the ref
    const scanner = new Html5QrcodeScanner(
      'qr-code-full-region',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
      },
      false
    );


    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      handleVerify(decodedText);
    };

    const onScanFailure = (errorMessage: string) => {
      // handle scan failure, usually better to ignore and keep scanning.
    };

    scanner.render(onScanSuccess, onScanFailure);
    

    // Cleanup function to clear the scanner on component unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isProcessing]); // Rerun effect if isProcessing changes

  const handleVerify = async (token: string) => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meal/verify-qr`, { token }, { withCredentials: true });
      setMessage(`Meal verified for ${response.data.user}.`);
      setError('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error verifying QR code. Please try again later.');
      }
      setMessage('');
    }
    // Do not set isProcessing back to false, to show the result message
    // and prevent the scanner from reappearing automatically.
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Verify Student QR</h1>
      <div className="w-full max-w-sm">
        {isProcessing ? (
          <LoadingAnimation />
        ) : (
          <div id="qr-code-full-region"></div>
        )}
        {message && <p className="text-green-500 mt-4">{message}</p>}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default VerifyStudentQRPage;