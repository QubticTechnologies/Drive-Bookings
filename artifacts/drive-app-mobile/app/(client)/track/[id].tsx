import { Feather, Ionicons } from "@expo/vector-icons";
import { useGetRide } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const STATUS_CONFIG = {
  pending: {
    label: "Finding Driver",
    color: COLORS.warning,
    bg: COLORS.warningDim,
    icon: "time-outline" as const,
    desc: "Searching for the nearest available driver…",
    step: 0,
  },
  accepted: {
    label: "Driver on the Way",
    color: COLORS.blue,
    bg: COLORS.blueDim,
    icon: "car-outline" as const,
    desc: "Your driver is heading to your pickup location.",
    step: 1,
  },
  in_progress: {
    label: "En Route",
    color: COLORS.accent,
    bg: COLORS.accentDim,
    icon: "navigate-outline" as const,
    desc: "You are on your way to your destination!",
    step: 2,
  },
  completed: {
    label: "Arrived",
    color: COLORS.success,
    bg: COLORS.successDim,
    icon: "checkmark-circle-outline" as const,
    desc: "You have arrived. Enjoy your time in Nassau!",
    step: 3,
  },
  cancelled: {
    label: "Cancelled",
    color: COLORS.error,
    bg: "rgba(239,68,68,0.12)",
    icon: "close-circle-outline" as const,
    desc: "This ride was cancelled.",
    step: -1,
  },
};

const STEPS = ["Finding", "Driver Assigned", "En Route", "Arrived"];

function PulsingRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.5, { duration: 1200 }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1200 }), -1, false);
  }, [scale, opacity]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.warning }, style]}
    />
  );
}

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { setActiveRideId } = useApp();
  const prevStatus = useRef<string | null>(null);

  const { data: ride, isLoading } = useGetRide(parseInt(id ?? "0", 10), {
    query: {
      enabled: !!id,
      refetchInterval: 3000,
    },
  });

  useEffect(() => {
    if (!ride) return;
    if (prevStatus.current && prevStatus.current !== ride.status) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevStatus.current = ride.status;
    if (ride.status === "completed") {
      setActiveRideId(null);
    }
  }, [ride?.status]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading || !ride) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.loadingText}>Loading ride…</Text>
        </View>
      </View>
    );
  }

  const status = STATUS_CONFIG[ride.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const isActive = !["completed", "cancelled"].includes(ride.status);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 24 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Ride #{ride.id}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status hero */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.statusHero, { backgroundColor: status.bg, borderColor: status.color + "44" }]}
        >
          <View style={{ alignItems: "center", justifyContent: "center", height: 64 }}>
            {ride.status === "pending" && <PulsingRing />}
            <Ionicons name={status.icon} size={36} color={status.color} />
          </View>
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          <Text style={styles.statusDesc}>{status.desc}</Text>
        </Animated.View>

        {/* Stepper */}
        {ride.status !== "cancelled" && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.stepper}>
            {STEPS.map((step, idx) => {
              const isPast = idx < status.step;
              const isCurrent = idx === status.step;
              return (
                <React.Fragment key={step}>
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        isPast && { backgroundColor: COLORS.success },
                        isCurrent && { backgroundColor: status.color, borderColor: status.color + "44", borderWidth: 3 },
                      ]}
                    />
                    <Text style={[styles.stepLabel, (isCurrent || isPast) && { color: isCurrent ? status.color : COLORS.success }]}>
                      {step}
                    </Text>
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepLine, idx < status.step && { backgroundColor: COLORS.success }]} />
                  )}
                </React.Fragment>
              );
            })}
          </Animated.View>
        )}

        {/* Trip info */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <View style={styles.tripRow}>
            <View style={[styles.tripDot, { backgroundColor: COLORS.blue }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tripLabel}>Pickup</Text>
              <Text style={styles.tripValue}>{ride.pickupLocation}</Text>
            </View>
          </View>
          <View style={{ width: 1, height: 16, backgroundColor: COLORS.border, marginLeft: 5 }} />
          <View style={styles.tripRow}>
            <View style={[styles.tripDot, { backgroundColor: COLORS.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tripLabel}>Drop-off</Text>
              <Text style={styles.tripValue}>{ride.dropoffLocation}</Text>
            </View>
          </View>

          <View style={styles.fareRow}>
            <View>
              <Text style={styles.tripLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmt}>${ride.estimatedFare.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.tripLabel}>Distance</Text>
              <Text style={styles.fareAmt}>{ride.distanceKm.toFixed(1)} km</Text>
            </View>
          </View>
        </Animated.View>

        {/* Driver info */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.card}>
          <Text style={styles.cardTitle}>Your Driver</Text>
          {ride.driver ? (
            <>
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={26} color={COLORS.textSub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{ride.driver.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <Ionicons name="star" size={13} color={COLORS.warning} />
                    <Text style={styles.driverMeta}>
                      {ride.driver.rating.toFixed(1)} · {ride.driver.totalRides} trips
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.platePill}>
                <Text style={styles.plateTxt}>{ride.driver.vehiclePlate}</Text>
                <Text style={styles.vehicleTxt}>
                  {ride.driver.vehicleColor} {ride.driver.vehicleMake} {ride.driver.vehicleModel}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.waitingDriver}>
              <View style={styles.loadingSpinner} />
              <Text style={styles.waitingText}>Matching with the nearest driver…</Text>
            </View>
          )}
        </Animated.View>

        {/* Done actions */}
        {!isActive && (
          <Animated.View entering={FadeInDown.delay(400).springify()} style={{ paddingHorizontal: 20 }}>
            <Pressable
              style={styles.bookAgainBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.replace("/(client)/book");
              }}
            >
              <Ionicons name="car-sport" size={18} color={COLORS.accent} />
              <Text style={styles.bookAgainText}>Book Another Ride</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  loadingText: { color: COLORS.textSub, fontSize: 16, fontFamily: "Inter_400Regular" },
  statusHero: { marginHorizontal: 20, borderRadius: 20, padding: 24, alignItems: "center", gap: 10, borderWidth: 1, marginBottom: 20 },
  statusLabel: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statusDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, marginBottom: 20 },
  stepItem: { alignItems: "center", gap: 6 },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border },
  stepLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: COLORS.textMuted, width: 56, textAlign: "center" },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginBottom: 16 },
  card: { backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  tripRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tripDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  tripLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.5 },
  tripValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.text, marginTop: 2 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  fareAmt: { fontSize: 22, fontFamily: "Inter_700Bold", color: COLORS.text, marginTop: 4 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  driverAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.cardElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  driverName: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  driverMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  platePill: { backgroundColor: COLORS.cardElevated, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border },
  plateTxt: { fontSize: 18, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: 2 },
  vehicleTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  waitingDriver: { alignItems: "center", paddingVertical: 20, gap: 12 },
  loadingSpinner: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, borderTopColor: COLORS.accent },
  waitingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  bookAgainBtn: { backgroundColor: COLORS.accentDim, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(173,255,0,0.25)" },
  bookAgainText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: COLORS.accent },
});
