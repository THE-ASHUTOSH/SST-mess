'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LoadingAnimation from '@/components/common/LoadingAnimation';
interface VerifiedUser {
  _id: string;
  name: string;
  email: string;
  picture: string;
}

interface Vendor {
  _id: string;
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
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/getVendors`, { withCredentials: true });
        console.log('Vendors fetched:', response.data.vendor);
        if (Array.isArray(response.data.vendor)) {
          setVendors(response.data.vendor);
        } else {
          setError('Failed to fetch vendors: Invalid data format.');
        }
      } catch (err) {
        setError('Failed to fetch vendors.');
      }
    };
    fetchVendors();
  }, []);

  // useEffect(() => {
  //   const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  //     event.preventDefault();
  //     event.returnValue = '';
  //   };
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, []);

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
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meal/verify-qr`, { token, vendorId: selectedVendor }, { withCredentials: true });
      console.log('Meal verified:', response.data);
      setMessage(`Meal verified for ${response.data.user.name}.`);
      setVerifiedUser(response.data.user);
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
        setVerifiedUser(null);
      }, 5000);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Verify Student QR</h1>
      
      <div className="mb-4 w-full max-w-sm">
        <label htmlFor="vendor-select" className="block text-sm font-medium text-gray-700 mb-2">Select Vendor</label>
        <select
          id="vendor-select"
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
          disabled={isProcessing}
        >
          <option value="" disabled>--Please choose a vendor--</option>
          {vendors.map((vendor) => (
            <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
          ))}
        </select>
      </div>

      {selectedVendor && (
        <div className="w-full max-w-sm" style={{ minHeight: '300px' }}>
          <div id={scannerContainerId} style={{ display: isProcessing ? 'none' : 'block' }}></div>
          {isProcessing && (
              <div className="flex flex-col items-center justify-center h-full mt-4">
                  {verifiedUser ? (
                    <div className="text-center">
                      <img src={verifiedUser.picture} alt={verifiedUser.name} className="w-32 h-32 mx-auto mb-4 border-4 border-purple-500" referrerPolicy='no-referrer'/>
                      <p className="text-green-500 text-xl">{message}</p>
                    </div>
                  ) : (
                    <>
                      {message && <p className="text-green-500 text-xl text-center">{message}</p>}
                      {error && <p className="text-red-500 text-xl text-center">{error}</p>}
                      {!message && !error && <LoadingAnimation />}
                    </>
                  )}
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyStudentQRPage;