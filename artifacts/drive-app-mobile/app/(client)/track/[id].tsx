import { Feather, Ionicons } from "@expo/vector-icons";
import { useGetRide, getBaseUrl } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
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
  scheduled: {
    label: "Scheduled",
    color: COLORS.blue,
    bg: COLORS.blueDim,
    icon: "calendar-outline" as const,
    desc: "Your ride is confirmed. We'll match you with a driver before your pickup time.",
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
    color: "#ff6b6b",
    bg: "rgba(239,68,68,0.12)",
    icon: "close-circle-outline" as const,
    desc: "This ride was cancelled.",
    step: -1,
  },
};

const STEPS = ["Finding", "Driver Assigned", "En Route", "Arrived"];

interface RideMsg {
  id: number;
  sender: string;
  senderType: string;
  body: string;
  createdAt: string;
}

// Helper: format ISO timestamp → "Mar 25, 14:32"
function fmtTs(ts: string | null | undefined): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return ""; }
}

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

// Ride timeline (timestamps for each stage)
function RideTimeline({ ride }: { ride: any }) {
  const events: { label: string; ts: string | null | undefined; color: string }[] = [
    { label: "Ride Requested",    ts: ride.createdAt,   color: COLORS.textSub },
    { label: "Driver Assigned",   ts: ride.acceptedAt,  color: COLORS.blue },
    { label: "Ride Started",      ts: ride.startedAt,   color: COLORS.accent },
    { label: "Completed",         ts: ride.completedAt, color: COLORS.success },
  ];

  const activeEvents = events.filter((e) => e.ts);
  if (activeEvents.length < 2) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ride Timeline</Text>
      {activeEvents.map((evt, idx) => (
        <View key={evt.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <View style={{ alignItems: "center", width: 14 }}>
            <View style={[styles.tlDot, { backgroundColor: evt.color }]} />
            {idx < activeEvents.length - 1 && <View style={styles.tlLine} />}
          </View>
          <View style={{ flex: 1, paddingBottom: idx < activeEvents.length - 1 ? 14 : 0 }}>
            <Text style={[styles.tlLabel, { color: evt.color }]}>{evt.label}</Text>
            <Text style={styles.tlTime}>{fmtTs(evt.ts)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { setActiveRideId } = useApp();
  const prevStatus = useRef<string | null>(null);
  const [messages, setMessages] = useState<RideMsg[]>([]);
  const msgSeen = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!id) return;
    const fetchMsgs = async () => {
      try {
        const base = getBaseUrl() ?? "";
        const res = await fetch(`${base}/api/rides/${id}/messages`);
        if (!res.ok) return;
        const data: RideMsg[] = await res.json();
        const newMsgs = data.filter((m) => !msgSeen.current.has(m.id));
        if (newMsgs.length > 0) {
          newMsgs.forEach((m) => msgSeen.current.add(m.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMessages(data);
        }
      } catch {}
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 4000);
    return () => clearInterval(interval);
  }, [id]);

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
  const isInProgress = ride.status === "in_progress";

  // Fare breakdown
  const baseFare = 3.0;
  const distFare = Math.round(1.5 * ride.distanceKm * 100) / 100;
  const totalFare = ride.estimatedFare;

  // Cast to any for optional fields not guaranteed in generated types
  const r = ride as any;
  const scheduledAt: string | null = r.scheduledAt ?? null;
  const acceptedAt: string | null  = r.acceptedAt ?? null;
  const startedAt: string | null   = r.startedAt ?? null;
  const completedAt: string | null = r.completedAt ?? null;
  const rideNotes: string | null   = r.notes ?? null;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 24 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(client)/book")} style={styles.backBtn}>
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
          {/* Scheduled badge */}
          {scheduledAt && ride.status === "scheduled" && (
            <View style={styles.scheduledBadge}>
              <Ionicons name="calendar" size={13} color={COLORS.blue} />
              <Text style={styles.scheduledText}>Scheduled for {fmtTs(scheduledAt)}</Text>
            </View>
          )}
        </Animated.View>

        {/* Stepper */}
        {ride.status !== "cancelled" && ride.status !== "scheduled" && (
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

          {/* Notes */}
          {rideNotes ? (
            <>
              <View style={[styles.divider, { marginVertical: 14 }]} />
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Feather name="message-square" size={14} color={COLORS.textSub} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripLabel}>Ride Notes</Text>
                  <Text style={[styles.tripValue, { fontSize: 14 }]}>{rideNotes}</Text>
                </View>
              </View>
            </>
          ) : null}

          <View style={styles.fareRow}>
            <View>
              <Text style={styles.tripLabel}>
                {ride.status === "completed" ? "Final Fare" : "Estimated Fare"}
              </Text>
              <Text style={styles.fareAmt}>${totalFare.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.tripLabel}>Distance</Text>
              <Text style={styles.fareAmt}>{ride.distanceKm.toFixed(1)} km</Text>
            </View>
          </View>
        </Animated.View>

        {/* Fare breakdown (completed only) */}
        {ride.status === "completed" && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Fare Breakdown</Text>
            <View style={styles.fareBreakRow}>
              <Text style={styles.fareBreakLabel}>Base fare</Text>
              <Text style={styles.fareBreakVal}>${baseFare.toFixed(2)}</Text>
            </View>
            <View style={styles.fareBreakRow}>
              <Text style={styles.fareBreakLabel}>Distance ({ride.distanceKm.toFixed(1)} km × $1.50)</Text>
              <Text style={styles.fareBreakVal}>${distFare.toFixed(2)}</Text>
            </View>
            <View style={[styles.divider, { marginVertical: 12 }]} />
            <View style={styles.fareBreakRow}>
              <Text style={[styles.fareBreakLabel, { color: COLORS.text, fontFamily: "Inter_600SemiBold" }]}>Total</Text>
              <Text style={[styles.fareBreakVal, { color: COLORS.success, fontSize: 20, fontFamily: "Inter_700Bold" }]}>
                ${totalFare.toFixed(2)}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "Inter_400Regular", marginTop: 8 }}>
              Cash · USD/BSD accepted
            </Text>
          </Animated.View>
        )}

        {/* Cancellation info */}
        {ride.status === "cancelled" && (
          <Animated.View entering={FadeInDown.delay(250).springify()}
            style={[styles.card, { borderColor: "#ff6b6b44" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="close-circle" size={20} color="#ff6b6b" />
              <Text style={[styles.cardTitle, { color: "#ff6b6b", marginBottom: 0 }]}>Ride Cancelled</Text>
            </View>
            <Text style={{ marginTop: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, lineHeight: 20 }}>
              This ride was cancelled. No charge has been applied.{"\n"}
              You can book a new ride anytime.
            </Text>
          </Animated.View>
        )}

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

        {/* Timeline */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <RideTimeline ride={{ ...ride, acceptedAt, startedAt, completedAt, createdAt: r.createdAt }} />
        </Animated.View>

        {/* GoRide Messages */}
        {messages.length > 0 && (
          <View style={[styles.card, { marginTop: 0 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(173,255,0,0.25)" }}>
                <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.accent} />
              </View>
              <Text style={[styles.cardTitle, { marginBottom: 0, flex: 1 }]}>Messages from GoRide</Text>
            </View>
            {messages.map((msg, idx) => (
              <View
                key={msg.id}
                style={{
                  backgroundColor: COLORS.cardElevated,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: idx < messages.length - 1 ? 10 : 0,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderTopLeftRadius: 4,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="logo-dribbble" size={12} color={COLORS.bg} />
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: COLORS.accent }}>GoRide</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: COLORS.textMuted, marginLeft: "auto" }}>
                    {fmtTs(msg.createdAt)}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.text, lineHeight: 20 }}>
                  {msg.body}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* SOS — only when actively in progress */}
        {isInProgress && (
          <Animated.View entering={FadeInDown.delay(400).springify()} style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <Pressable
              style={styles.sosBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  "🆘 Emergency Contact",
                  "Do you need to call for help?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Call 919 (Police)", onPress: () => Linking.openURL("tel:919") },
                    { text: "Call 242-302-2221 (GoRide)", onPress: () => Linking.openURL("tel:2423022221") },
                  ]
                );
              }}
            >
              <Ionicons name="alert-circle" size={22} color="#fff" />
              <Text style={styles.sosBtnText}>Emergency / SOS</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Done actions */}
        {!isActive && (
          <Animated.View entering={FadeInDown.delay(420).springify()} style={{ paddingHorizontal: 20 }}>
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
  scheduledBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.blueDim, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  scheduledText: { fontSize: 13, fontFamily: "Inter_500Medium", color: COLORS.blue },
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
  divider: { height: 1, backgroundColor: COLORS.border },
  fareRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  fareAmt: { fontSize: 22, fontFamily: "Inter_700Bold", color: COLORS.text, marginTop: 4 },
  fareBreakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  fareBreakLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  fareBreakVal: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.text },
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
  tlDot: { width: 10, height: 10, borderRadius: 5 },
  tlLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: COLORS.border, marginTop: 4 },
  tlLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tlTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textMuted, marginTop: 2 },
  sosBtn: { backgroundColor: "#c0392b", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  sosBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: 0.3 },
  bookAgainBtn: { backgroundColor: COLORS.accentDim, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(173,255,0,0.25)" },
  bookAgainText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: COLORS.accent },
});
