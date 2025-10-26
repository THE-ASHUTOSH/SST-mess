"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import axios from 'axios'
interface Vendor {
  _id: string;
  name: string;
  price: number;
  description: string;
  menu: string;
}
const SelectVendor = () => {
  const [formData, setFormData] = useState({
    name: '',
    room: '',
    mess: ''
  })

  const [showMessage, setShowMessage] = useState(false)


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'mess') {
      setShowMessage(true)
    }
  }

  const [vendors, setvendors] = useState<Vendor[]>([])
  useEffect(() => {
    async function loadVendors() {
      try {
        const response = await axios.get("http://127.0.0.1:5000/vendor/getVendors", { withCredentials: true });
        setvendors(response.data.vendor);
        console.log("Vendors fetched:", vendors);
      } catch (err) {
        console.log(err);
      }
    }

    loadVendors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    try {
      const user = await fetch('http://localhost:5000/auth/details', { credentials: 'include' });
      console.log(await user.json());
      // const response = await axios.post('http://localhost:5000/vendor/vendorSelectionForm', formData, { withCredentials: true });
      // console.log('Form submitted successfully', response.data.vendorSection);
      const url = 'http://localhost:5000/vendor/vendorSelectionForm';

      // Assuming 'formData' is a JavaScript object (not a native FormData object)
      // that needs to be sent as JSON, which is typical for an Axios POST request.
      const requestBody = JSON.stringify({
        name: formData.name,
        room : formData.room,
        vendor : formData.mess
      });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // NOTE: If using a native FormData object (for file uploads), 
            // omit 'Content-Type', and pass formData directly as the body.
          },
          body: requestBody,

          // 👈 The 'fetch' equivalent of axios's 'withCredentials: true'
          credentials: 'include'
        });

        if (!response.ok) {
          // Handle HTTP error statuses (4xx, 5xx)
          // Note: fetch() only throws an error for network failures, not for 4xx/5xx responses
          const errorData = await response.json();
          throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorData.message || 'Unknown error'}`);
        }

        // Process the successful response
        const data = await response.json();
        console.log('Success:', data);

      } catch (error) {
        console.error('Fetch operation failed:', error);
      }
    } catch (error) {
      console.error(error);
    }
  };


  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
            Select Your Mess
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="room" className="text-sm font-medium text-gray-300">
                Room Number
              </label>
              <input
                type="text"
                id="room"
                name="room"
                value={formData.room}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter your room number"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="mess" className="text-sm font-medium text-gray-300">
                Select Mess
              </label>
              <select
                id="mess"
                name="mess"
                value={formData.mess}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                required
              >
                <option value="">Select a mess</option>
                {vendors.map(option => (
                  <option key={option._id} value={option._id}>
                    {option.name} - ₹{option.price}
                  </option>
                ))}
              </select>
            </div>

            {showMessage && formData.mess && (
              <div className="py-3 px-4 rounded-lg bg-blue-500/10 border border-blue-500/20 animate-fade-in">
                <p className="text-sm text-blue-400">
                  You have selected {vendors.find(opt => opt._id === formData.mess)?.name}.
                  Please ensure this is your final choice as it cannot be changed later.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Submit Selection
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default SelectVendor