import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

function GRMark({ size = 72 }: { size?: number }) {
  const radius = size * 0.22;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.04 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: COLORS.accentDim,
          borderWidth: 1.5,
          borderColor: COLORS.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: size * 0.52, fontFamily: "Inter_700Bold", color: COLORS.accent, letterSpacing: -1 }}>G</Text>
      </View>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: COLORS.goldDim,
          borderWidth: 1.5,
          borderColor: COLORS.gold,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: size * 0.52, fontFamily: "Inter_700Bold", color: COLORS.gold, letterSpacing: -1 }}>R</Text>
      </View>
    </View>
  );
}

export default function RootIndex() {
  const { role, hydrated, driverId, activeRideId } = useApp();

  if (!hydrated) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={["rgba(0,194,212,0.08)", "rgba(255,199,44,0.04)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
        />
        <View style={styles.logoWrap}>
          <GRMark size={72} />
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <Text style={styles.logoText}>GoRide</Text>
          </View>
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 44 }} />
        </View>
      </View>
    );
  }

  if (role === "driver" && driverId) {
    return <Redirect href="/(driver)/dashboard" />;
  }
  if (role === "rider" || role === "guest") {
    if (activeRideId) {
      return <Redirect href={`/(client)/track/${activeRideId}`} />;
    }
    return <Redirect href="/(client)/book" />;
  }

  return <Redirect href="/(auth)/" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  logoWrap: { alignItems: "center" },
  logoText: { fontSize: 34, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -1.2 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 4, letterSpacing: 0.2 },
});
