"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface MealsOptions {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface Vendor {
  mealsOptions: MealsOptions;
  _id: string;
  name: string;
  description: string;
  price: number;
  menuUrl: string;
  updatedAt: string;
  menu: null;
  createdAt: string;
  __v: number;
}

export interface LatestSelection {
  _id: string;
  user: string;
  vendor: Vendor;
  preference: string;
  forMonth: string;
  dateofEntry: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface DashboardContextType {
  latestSelection: LatestSelection | null;
  isFeedbackEnabled: boolean;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [latestSelection, setLatestSelection] = useState<LatestSelection | null>(null);
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestSelection = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/user/latest-vendor`, {
          withCredentials: true,
        });
        setLatestSelection(response.data.latestSelection);
      } catch (error) {
        // console.error('Error fetching latest vendor selection:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchFeedbackStatus = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/controls/feedback-toggle`, {
          withCredentials: true,
        });
        setIsFeedbackEnabled(response.data.enabled);
      } catch (error) {
        // console.error('Error fetching feedback status:', error);
      }
    };

    fetchLatestSelection();
    fetchFeedbackStatus();
  }, []);

  return (
    <DashboardContext.Provider value={{ latestSelection, isFeedbackEnabled, loading }}>
      {children}
    </DashboardContext.Provider>
  );
};
