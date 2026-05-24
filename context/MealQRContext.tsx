"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { isAxiosError } from "axios";
import axiosInstance from "@/lib/axiosInstance";

const QR_TTL_SECONDS = 30;

interface MealQRContextValue {
  token: string;
  error: string;
  loading: boolean;
  refreshing: boolean;
  scanned: boolean;
  secondsLeft: number;
  expired: boolean;
  refresh: () => Promise<void>;
}

const MealQRContext = createContext<MealQRContextValue | null>(null);

export function MealQRProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  // initialLoading is true only on the very first fetch of the session, so
  // navigating away and back doesn't re-show the skeleton.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QR_TTL_SECONDS);
  const initialFetchStarted = useRef(false);

  const fetchQrCode = useCallback(async () => {
    try {
      setError("");
      const response = await axiosInstance.get(`/api/meal/generate-qr`);
      setToken(response.data.token);
      setSecondsLeft(QR_TTL_SECONDS);
      setScanned(false);
    } catch (err: unknown) {
      setToken("");
      if (isAxiosError(err) && err.response?.status === 403) {
        setError(err.response.data?.message ?? "Cannot generate QR right now.");
      } else {
        setError("Error generating QR code. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch exactly once for the lifetime of the provider.
  useEffect(() => {
    if (initialFetchStarted.current) return;
    initialFetchStarted.current = true;
    fetchQrCode();
  }, [fetchQrCode]);

  // Countdown — stops at 0; user taps refresh to regenerate.
  useEffect(() => {
    if (!token || scanned || error || secondsLeft <= 0) return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [token, scanned, error, secondsLeft]);

  // Poll meal status so the panel flips to "Verified" once the vendor scans.
  useEffect(() => {
    if (!token || scanned) return;
    const interval = setInterval(async () => {
      try {
        const response = await axiosInstance.get(`/api/meal/status`);
        if (response.data.status === "scanned") {
          setScanned(true);
        }
      } catch {
        // Transient network errors are not worth surfacing.
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [token, scanned]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }
    setRefreshing(true);
    try {
      await fetchQrCode();
    } finally {
      setRefreshing(false);
    }
  }, [fetchQrCode, refreshing]);

  const expired = !!token && secondsLeft <= 0 && !scanned;

  return (
    <MealQRContext.Provider
      value={{
        token,
        error,
        loading,
        refreshing,
        scanned,
        secondsLeft,
        expired,
        refresh,
      }}
    >
      {children}
    </MealQRContext.Provider>
  );
}

export function useMealQR() {
  const ctx = useContext(MealQRContext);
  if (!ctx) {
    throw new Error("useMealQR must be used within a MealQRProvider");
  }
  return ctx;
}
