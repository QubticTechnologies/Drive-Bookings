import { Feather, Ionicons } from "@expo/vector-icons";
import {
  useGetDriver,
  useListRides,
  useUpdateDriverStatus,
  useUpdateRideStatus,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    available: { label: "Available", color: COLORS.success, bg: COLORS.successDim },
    busy: { label: "On a Ride", color: COLORS.warning, bg: COLORS.warningDim },
    offline: { label: "Offline", color: COLORS.textSub, bg: "rgba(136,136,136,0.12)" },
  };
  const cfg = map[status] ?? map.offline;
  return (
    <View style={[badgeStyles.pill, { backgroundColor: cfg.bg }]}>
      <View style={[badgeStyles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

type Ride = {
  id: number;
  clientName: string;
  clientPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  estimatedFare: number;
  status: string;
  driverId?: number | null;
  notes?: string | null;
};

function RideCard({ ride, driverId }: { ride: Ride; driverId: number }) {
  const { mutate: updateStatus } = useUpdateRideStatus({
    mutation: {
      onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    },
  });

  const isMyRide = ride.driverId === driverId;
  const isPending = ride.status === "pending";
  const isAccepted = ride.status === "accepted" && isMyRide;
  const isInProgress = ride.status === "in_progress" && isMyRide;

  return (
    <Animated.View layout={LinearTransition} entering={FadeInDown.springify()} style={rideStyles.card}>
      <View style={rideStyles.top}>
        <Text style={rideStyles.fare}>${ride.estimatedFare.toFixed(2)}</Text>
        <Text style={rideStyles.dist}>{ride.distanceKm.toFixed(1)} km</Text>
      </View>

      <View style={rideStyles.locRow}>
        <View style={[rideStyles.locDot, { backgroundColor: COLORS.blue }]} />
        <Text style={rideStyles.locText} numberOfLines={1}>{ride.pickupLocation}</Text>
      </View>
      <View style={{ width: 1, height: 8, backgroundColor: COLORS.border, marginLeft: 6 }} />
      <View style={rideStyles.locRow}>
        <View style={[rideStyles.locDot, { backgroundColor: COLORS.accent }]} />
        <Text style={rideStyles.locText} numberOfLines={1}>{ride.dropoffLocation}</Text>
      </View>

      <Text style={rideStyles.client}>
        {ride.clientName} · {ride.clientPhone}
      </Text>

      {isPending && (
        <Pressable
          style={rideStyles.acceptBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateStatus({ rideId: ride.id, data: { status: "accepted", driverId } });
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color={COLORS.bg} />
          <Text style={rideStyles.acceptBtnText}>Accept Ride</Text>
        </Pressable>
      )}

      {isAccepted && (
        <Pressable
          style={[rideStyles.acceptBtn, { backgroundColor: COLORS.blue }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateStatus({ rideId: ride.id, data: { status: "in_progress" } });
          }}
        >
          <Ionicons name="navigate" size={18} color={COLORS.white} />
          <Text style={[rideStyles.acceptBtnText, { color: COLORS.white }]}>Start Ride</Text>
        </Pressable>
      )}

      {isInProgress && (
        <Pressable
          style={[rideStyles.acceptBtn, { backgroundColor: COLORS.success }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            updateStatus({ rideId: ride.id, data: { status: "completed" } });
          }}
        >
          <Ionicons name="flag" size={18} color={COLORS.white} />
          <Text style={[rideStyles.acceptBtnText, { color: COLORS.white }]}>Complete Ride</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const rideStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  fare: { fontSize: 24, fontFamily: "Inter_700Bold", color: COLORS.text },
  dist: { fontSize: 14, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  locRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  locText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.text },
  client: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 10, marginBottom: 14 },
  acceptBtn: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  acceptBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
});

export default function DriverDashboard() {
  const insets = useSafeAreaInsets();
  const { driverId, driverName, logout } = useApp();

  const { data: driver, refetch: refetchDriver } = useGetDriver(driverId ?? 0, {
    query: { enabled: !!driverId, refetchInterval: 5000 },
  });

  const { data: allRides, refetch: refetchRides, isRefetching } = useListRides(
    {},
    { query: { refetchInterval: 4000 } }
  );

  const { mutate: updateDriverStatus } = useUpdateDriverStatus({
    mutation: {
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        refetchDriver();
      },
    },
  });

  useEffect(() => {
    if (!driverId) router.replace("/(driver)/");
  }, [driverId]);

  const pendingRides = (allRides ?? []).filter((r: Ride) => r.status === "pending");
  const myActiveRide = (allRides ?? []).find(
    (r: Ride) => r.driverId === driverId && ["accepted", "in_progress"].includes(r.status)
  ) as Ride | undefined;

  const isAvailable = driver?.status === "available";
  const isOffline = driver?.status === "offline";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const displayRides: Ride[] = myActiveRide
    ? [myActiveRide]
    : isAvailable
    ? pendingRides
    : [];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {driver?.name ?? driverName ?? "Driver"}</Text>
          <StatusBadge status={driver?.status ?? "offline"} />
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            logout();
            router.replace("/");
          }}
          style={styles.logoutBtn}
        >
          <Feather name="log-out" size={20} color={COLORS.textSub} />
        </Pressable>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{driver?.totalRides ?? 0}</Text>
          <Text style={styles.statLabel}>Total Rides</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{driver?.rating?.toFixed(1) ?? "5.0"}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{pendingRides.length}</Text>
          <Text style={styles.statLabel}>Requests</Text>
        </View>
      </Animated.View>

      {/* Online toggle */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.toggleCard}>
        <View>
          <Text style={styles.toggleTitle}>{isOffline ? "You are Offline" : isAvailable ? "You are Online" : "You are Busy"}</Text>
          <Text style={styles.toggleSub}>{isOffline ? "Toggle to start receiving rides" : isAvailable ? "Accepting new ride requests" : "Complete your current ride first"}</Text>
        </View>
        <Switch
          value={!isOffline}
          disabled={driver?.status === "busy"}
          onValueChange={(val) => {
            updateDriverStatus({ driverId: driverId!, data: { status: val ? "available" : "offline" } });
          }}
          trackColor={{ false: COLORS.border, true: COLORS.accentGlow }}
          thumbColor={!isOffline ? COLORS.accent : COLORS.textMuted}
        />
      </Animated.View>

      {/* Rides list */}
      <FlatList
        data={displayRides}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!displayRides.length}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetchRides(); refetchDriver(); }}
            tintColor={COLORS.accent}
          />
        }
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text style={styles.listHeader}>
              {myActiveRide
                ? "Active Ride"
                : isAvailable
                ? `${pendingRides.length} Pending Request${pendingRides.length !== 1 ? "s" : ""}`
                : "Go online to receive ride requests"}
            </Text>
          </Animated.View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(400)} style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{isAvailable ? "Waiting for requests…" : "You are offline"}</Text>
            <Text style={styles.emptySub}>{isAvailable ? "New ride requests will appear here" : "Toggle the switch above to go online"}</Text>
          </Animated.View>
        }
        renderItem={({ item }) => (
          <RideCard ride={item as Ride} driverId={driverId!} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.5, marginBottom: 8 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", color: COLORS.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 2 },
  toggleCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, backgroundColor: COLORS.card, borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  toggleTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: COLORS.text, marginBottom: 4 },
  toggleSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub, maxWidth: 220 },
  list: { paddingHorizontal: 20 },
  listHeader: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center" },
});
