'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';

const GetFoodPage = () => {
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meal/generate-qr`, { withCredentials: true });
        const token = response.data.token;
        setQrCode(`https://api.qrserver.com/v1/create-qr-code/?data=${token}&size=200x200`);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError(err.response.data.message);
        } else {
          setError('Error generating QR code. Please try again later.');
        }
      }
      setLoading(false);
    };

    fetchQrCode();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Your QR Code</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {qrCode && !error && (
        <div className="flex flex-col items-center">
          <Image src={qrCode} alt="QR Code" width={200} height={200} />
          <p className="mt-4 text-gray-500">Scan this QR code to get your food.</p>
        </div>
      )}
    </div>
  );
};

export default GetFoodPage;
