"use client";
import React, { useState, useEffect } from "react";
import EventCard from "@/components/common/EventCard";
import LoadingSpinner from "@/components/common/LoadingAnimation";

interface DailyMenuItem {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

interface VendorMenu {
  [key: string]: DailyMenuItem;
}

interface Vendor {
  _id: string;
  name: string;
  price: number;
  description: string;
  menu: VendorMenu | null;
  menuUrl: string;
}

const VendorDetail = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenuUrl, setSelectedMenuUrl] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState<boolean>(false);
  const [showTodayMenu, setShowTodayMenu] = useState<boolean>(false);
  const [selectedVendorMenu, setSelectedVendorMenu] = useState<VendorMenu | null>(null);

  useEffect(() => {
    async function loadVendors() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/getVendors`,
          {
            method: "GET",

            credentials: "include",

            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // console.log(data.vendor);
        setVendors(data.vendor);
      } catch (err) {
        // console.error("Failed to fetch vendors:", err);
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, []);

  const handleViewTodayMenuClick = (menu: VendorMenu | null) => {
    setSelectedVendorMenu(menu);
    setShowTodayMenu(true);
  };

  const getEmbeddableUrl = (url: string | null): string => {
    if (!url) return "";
    try {
      if (url.includes("drive.google.com/file")) {
        const parts = url.split("/d/");
        if (parts.length > 1) {
          const id = parts[1].split("/")[0];
          return `https://drive.google.com/file/d/${id}/preview`;
        }
      }

      return url;
    } catch (error) {
      console.error("Error getting embeddable URL:", error);
      return url;
    }
  };

  const handleViewMenuClick = (menuUrl: string) => {
    const embedUrl = getEmbeddableUrl(menuUrl);
    setSelectedMenuUrl(embedUrl);
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);

    setSelectedMenuUrl(null);
  };

  const getDayOfWeek = () => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    return days[new Date().getDay()];
  };

  const dayOfWeek = getDayOfWeek();

  const dailyMenu = selectedVendorMenu ? selectedVendorMenu[dayOfWeek] : null;
  // console.log("Selected Vendor Menu:", selectedVendorMenu);
  // console.log("Daily Menu:", dailyMenu);


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">
        Menu
      </h1>

      {loading && <LoadingSpinner />}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {vendors.map((vendor) => (
            <EventCard
              key={vendor._id}
              title={vendor.name}
              description={`Price: ₹${vendor.price}`}
            >
              <p>{vendor.description}</p>

              <button
                onClick={() => handleViewMenuClick(vendor.menuUrl)}
                className="mt-4 mr-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Menu Pdf
              </button>

              <button
                onClick={() => handleViewTodayMenuClick(vendor.menu)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Menu
              </button>
            </EventCard>
          ))}
        </div>
      )}

      {showViewer && selectedMenuUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <button
              onClick={handleCloseViewer}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <iframe
              src={selectedMenuUrl}
              className="w-full h-full border-none"
              title="Menu Viewer"
              referrerPolicy="no-referrer"
            ></iframe>
          </div>
        </div>
      )}

      {showTodayMenu && selectedVendorMenu && (
        <div className="fixed  inset-0 z-50 flex items-center justify-center bg-opacity-75 p-4 backdrop-blur-sm ">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setShowTodayMenu(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2 className="text-2xl font-bold mb-4">Menu for {dayOfWeek}</h2>

            {dailyMenu ? (
              <div className="space-y-4">
                <EventCard title="Breakfast">
                  <p>
                    {Array.isArray(dailyMenu.breakfast) && dailyMenu.breakfast.length > 0
                      ? dailyMenu.breakfast.join(', ')
                      : 'Not available'}
                  </p>
                </EventCard>
                <EventCard title="Lunch">
                  <p>
                    {Array.isArray(dailyMenu.lunch) && dailyMenu.lunch.length > 0
                      ? dailyMenu.lunch.join(', ')
                      : 'Not available'}
                  </p>
                </EventCard>
                <EventCard title="Dinner">
                  <p>
                    {Array.isArray(dailyMenu.dinner) && dailyMenu.dinner.length > 0
                      ? dailyMenu.dinner.join(', ')
                      : 'Not available'}
                  </p>
                </EventCard>
              </div>
            ) : (
              <p>Menu for today is not available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDetail;
