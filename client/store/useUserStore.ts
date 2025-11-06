"use client";
import create from 'zustand'

type User = {
  email?: string;
  name?: string;
  picture?: string | null;
  role?: string;
  roll?: string;
  id?: string;
} | null;

type State = {
  user: User;
  loading: boolean;
  setUser: (u: User) => void;
  setLoading: (v: boolean) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

const useUserStore = create<State>((set: any, get: any) => ({
  user: null,
  loading: true,
  setUser: (u: User) => set({ user: u }),
  setLoading: (v: boolean) => set({ loading: v }),
  initialize: async () => {
    // idempotent initialize; useful to call from a client component once
    try {
      set({ loading: true });
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verifyanddetails`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user ?? data, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (err) {
      // network or other error
      // keep user null
      // eslint-disable-next-line no-console
      console.error('User verification error', err);
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Logout error', err);
    }
    set({ user: null });
  },
}))

export default useUserStore
