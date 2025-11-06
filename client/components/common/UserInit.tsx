"use client";
import { useEffect } from 'react';
import useUserStore from '@/store/useUserStore';

export default function UserInit() {
  useEffect(() => {
    // initialize user verification on first client render
    // call directly from store to avoid re-rendering
    const s = useUserStore.getState();
    if (typeof s.initialize === 'function') s.initialize();
  }, []);
  return null;
}
