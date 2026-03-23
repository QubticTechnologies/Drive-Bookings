import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Role = "client" | "driver" | null;

interface AppState {
  role: Role;
  driverId: number | null;
  driverName: string | null;
  activeRideId: number | null;
  setRole: (role: Role) => void;
  setDriver: (id: number, name: string) => void;
  setActiveRideId: (id: number | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppState>({
  role: null,
  driverId: null,
  driverName: null,
  activeRideId: null,
  setRole: () => {},
  setDriver: () => {},
  setActiveRideId: () => {},
  logout: () => {},
});

const STORAGE_KEY = "driveapp_session";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [activeRideId, setActiveRideIdState] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        setRoleState(data.role ?? null);
        setDriverId(data.driverId ?? null);
        setDriverName(data.driverName ?? null);
        setActiveRideIdState(data.activeRideId ?? null);
      } catch {}
    });
  }, []);

  const persist = useCallback(
    (updates: Partial<{ role: Role; driverId: number | null; driverName: string | null; activeRideId: number | null }>) => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          role,
          driverId,
          driverName,
          activeRideId,
          ...updates,
        })
      );
    },
    [role, driverId, driverName, activeRideId]
  );

  const setRole = useCallback(
    (r: Role) => {
      setRoleState(r);
      persist({ role: r });
    },
    [persist]
  );

  const setDriver = useCallback(
    (id: number, name: string) => {
      setDriverId(id);
      setDriverName(name);
      persist({ driverId: id, driverName: name });
    },
    [persist]
  );

  const setActiveRideId = useCallback(
    (id: number | null) => {
      setActiveRideIdState(id);
      persist({ activeRideId: id });
    },
    [persist]
  );

  const logout = useCallback(() => {
    setRoleState(null);
    setDriverId(null);
    setDriverName(null);
    setActiveRideIdState(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AppContext.Provider
      value={{ role, driverId, driverName, activeRideId, setRole, setDriver, setActiveRideId, logout }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
