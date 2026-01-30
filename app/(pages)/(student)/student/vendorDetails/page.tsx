"use client";
import React, { useState, useEffect } from "react";
import EventCard from "@/components/common/EventCard";
import { CardSkeleton } from "@/components/common/Skeletons";
import axiosInstance from '@/lib/axiosInstance';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface DailyMenuItem {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

interface VendorMenu {
  [key: string]: DailyMenuItem;
}

interface Vendor {
  id: string;
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
        const response = await axiosInstance.get(`/api/vendor/getVendors`);
        setVendors(response.data.vendors);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-primary tracking-tight animate-fade-in-up">
        Menu
      </h1>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {vendors.map((vendor) => (
            <EventCard
              key={vendor.id}
              title={vendor.name}
              description={`Price: ₹${vendor.price}`}
            >
              <p className="text-sm text-muted-foreground mb-4">{vendor.description}</p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleViewMenuClick(vendor.menuUrl)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  View Menu PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleViewTodayMenuClick(vendor.menu)}
                  className="w-full border-blue-600 text-blue-400 hover:bg-blue-600/10 hover:text-blue-300"
                >
                  View Today's Menu
                </Button>
              </div>
            </EventCard>
          ))}
        </div>
      )}

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-card border-border">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Menu PDF</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full p-4 pt-2">
            {selectedMenuUrl && (
              <iframe
                src={selectedMenuUrl}
                className="w-full h-full rounded-md border border-border"
                title="Menu Viewer"
                referrerPolicy="no-referrer"
              ></iframe>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTodayMenu} onOpenChange={setShowTodayMenu}>
        <DialogContent className="max-w-md max-h-[90vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Menu for {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {dailyMenu ? (
              <div className="space-y-4 py-2">
                <Card className="bg-secondary/20 border-border">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 text-primary">Breakfast</h3>
                    <p className="text-muted-foreground">
                      {Array.isArray(dailyMenu.breakfast) && dailyMenu.breakfast.length > 0
                        ? dailyMenu.breakfast.join(', ')
                        : 'Not available'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/20 border-border">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 text-primary">Lunch</h3>
                    <p className="text-muted-foreground">
                      {Array.isArray(dailyMenu.lunch) && dailyMenu.lunch.length > 0
                        ? dailyMenu.lunch.join(', ')
                        : 'Not available'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/20 border-border">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 text-primary">Dinner</h3>
                    <p className="text-muted-foreground">
                      {Array.isArray(dailyMenu.dinner) && dailyMenu.dinner.length > 0
                        ? dailyMenu.dinner.join(', ')
                        : 'Not available'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Menu for today is not available.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDetail;