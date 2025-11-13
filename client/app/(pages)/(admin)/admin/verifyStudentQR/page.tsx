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
  const scannerContainerId = 'qr-code-full-region';

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isProcessing) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Error clearing scanner:", err));
        scannerRef.current = null;
      }
      return;
    }

    // Only create a new scanner if one doesn't exist and the container is in the DOM
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
        // The clear method might throw an error if the scanner is already cleared or the element is gone.
        scannerRef.current.clear().catch(err => console.error("Error clearing scanner on unmount:", err));
        scannerRef.current = null;
      }
    };
  }, [isProcessing]);

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
    } finally {
      setTimeout(() => {
        setMessage('');
        setError('');
        setIsProcessing(false);
      }, 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Verify Student QR</h1>
      <div className="w-full max-w-sm" style={{ minHeight: '300px' }}>
        <div id={scannerContainerId} style={{ display: isProcessing ? 'none' : 'block' }}></div>
        {isProcessing && (
            <div className="flex flex-col items-center justify-center h-full mt-4">
                {message && <p className="text-green-500 text-xl text-center">{message}</p>}
                {error && <p className="text-red-500 text-xl text-center">{error}</p>}
                {!message && !error && <LoadingAnimation />}
            </div>
        )}
      </div>
    </div>
  );
};

export default VerifyStudentQRPage;