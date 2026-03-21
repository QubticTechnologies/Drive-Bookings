import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SessionState = {
  mode: 'client' | 'driver' | null;
  driverId: number | null;
  clientDetails: {
    name: string;
    phone: string;
  } | null;
  activeRideId: number | null;
  
  setMode: (mode: 'client' | 'driver' | null) => void;
  setDriverId: (id: number | null) => void;
  setClientDetails: (details: { name: string; phone: string } | null) => void;
  setActiveRideId: (id: number | null) => void;
  logout: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      mode: null,
      driverId: null,
      clientDetails: null,
      activeRideId: null,
      
      setMode: (mode) => set({ mode }),
      setDriverId: (driverId) => set({ driverId }),
      setClientDetails: (clientDetails) => set({ clientDetails }),
      setActiveRideId: (activeRideId) => set({ activeRideId }),
      logout: () => set({ mode: null, driverId: null, clientDetails: null, activeRideId: null }),
    }),
    {
      name: 'driveapp-session',
    }
  )
);
