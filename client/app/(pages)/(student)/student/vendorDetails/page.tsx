"use client"
import React, { useState, useEffect, use } from 'react'
import EventCard from '@/components/common/EventCard'
interface Vendor {
  _id: string;
  name: string;
  price: number;
  description: string;
  menu: string;
}
const VendorDetail = () => {
  const [vendors, setvendors] = useState<Vendor[]>([])
  useEffect(() => {
    console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
    async function loadVendors() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/getVendors`, {
          method: "GET",
          credentials: "include", // equivalent to withCredentials: true
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setvendors(data.vendor);
        console.log("Vendors fetched:", data.vendor);
      } catch (err) {
        console.log(err);
      }
    }

    loadVendors();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Menu</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">

        {vendors.map((vendor) => (
          <EventCard
            key={vendor._id}
            title={vendor.name}
            description={`Price: ₹${vendor.price}`}
            redirectUrl={vendor.menu} // custom prop for redirect

          >
            <p>{vendor.description}</p>
          </EventCard>
        ))}


      </div>
    </div>
  )
}

export default VendorDetail