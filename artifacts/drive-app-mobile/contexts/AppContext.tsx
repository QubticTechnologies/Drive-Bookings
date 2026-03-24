import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Role = "rider" | "driver" | "guest" | null;

interface RiderUser {
  id: string;
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  preferredLanguage: string;
  isVerified: boolean;
  totalRides: number;
  rating: number;
}

interface AppState {
  // Shared role
  role: Role;
  hydrated: boolean;
  // Rider / guest
  userId: string | null;
  riderUser: RiderUser | null;
  guestName: string | null;
  // Phone verification flow
  pendingPhone: string | null;
  pendingUserId: string | null;
  // Driver
  driverId: number | null;
  driverName: string | null;
  // Ride tracking
  activeRideId: number | null;

  setRiderUser: (user: RiderUser) => void;
  setGuestMode: (name: string) => void;
  setPendingPhone: (phone: string, userId: string) => void;
  setDriver: (id: number, name: string) => void;
  setRole: (role: Role) => void;
  setActiveRideId: (id: number | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppState>({
  role: null,
  hydrated: false,
  userId: null,
  riderUser: null,
  guestName: null,
  pendingPhone: null,
  pendingUserId: null,
  driverId: null,
  driverName: null,
  activeRideId: null,
  setRiderUser: () => {},
  setGuestMode: () => {},
  setPendingPhone: () => {},
  setDriver: () => {},
  setRole: () => {},
  setActiveRideId: () => {},
  logout: () => {},
});

const STORAGE_KEY = "driveapp_session_v2";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [riderUser, setRiderUserState] = useState<RiderUser | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [pendingPhone, setPendingPhoneState] = useState<string | null>(null);
  const [pendingUserId, setPendingUserIdState] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [activeRideId, setActiveRideIdState] = useState<number | null>(null);

  // Hydrate from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const d = JSON.parse(raw);
          setRoleState(d.role ?? null);
          setUserId(d.userId ?? null);
          setRiderUserState(d.riderUser ?? null);
          setGuestName(d.guestName ?? null);
          setDriverId(d.driverId ?? null);
          setDriverName(d.driverName ?? null);
          setActiveRideIdState(d.activeRideId ?? null);
        } catch {}
      }
      setHydrated(true);
    });
  }, []);

  const persist = useCallback(
    (patch: object) => {
      const current = { role, userId, riderUser, guestName, driverId, driverName, activeRideId };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    },
    [role, userId, riderUser, guestName, driverId, driverName, activeRideId]
  );

  const setRiderUser = useCallback(
    (user: RiderUser) => {
      setRoleState("rider");
      setUserId(user.id);
      setRiderUserState(user);
      persist({ role: "rider", userId: user.id, riderUser: user });
    },
    [persist]
  );

  const setGuestMode = useCallback(
    (name: string) => {
      setRoleState("guest");
      setGuestName(name);
      persist({ role: "guest", guestName: name });
    },
    [persist]
  );

  const setPendingPhone = useCallback(
    (phone: string, uId: string) => {
      setPendingPhoneState(phone);
      setPendingUserIdState(uId);
    },
    []
  );

  const setDriver = useCallback(
    (id: number, name: string) => {
      setDriverId(id);
      setDriverName(name);
      persist({ driverId: id, driverName: name });
    },
    [persist]
  );

  const setRole = useCallback(
    (r: Role) => {
      setRoleState(r);
      persist({ role: r });
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
    setUserId(null);
    setRiderUserState(null);
    setGuestName(null);
    setDriverId(null);
    setDriverName(null);
    setActiveRideIdState(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AppContext.Provider
      value={{
        role,
        hydrated,
        userId,
        riderUser,
        guestName,
        pendingPhone,
        pendingUserId,
        driverId,
        driverName,
        activeRideId,
        setRiderUser,
        setGuestMode,
        setPendingPhone,
        setDriver,
        setRole,
        setActiveRideId,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
