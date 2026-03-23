import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

export default function RootIndex() {
  const { role, driverId, activeRideId } = useApp();
  const [ready, setReady] = useState(false);

  // Brief delay to allow context to hydrate from AsyncStorage
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={["rgba(173,255,0,0.07)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.8 }}
        />
        <Animated.View entering={FadeIn.duration(500)} style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Ionicons name="car-sport" size={36} color={COLORS.accent} />
          </View>
          <Text style={styles.logoText}>DriveApp</Text>
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
        </Animated.View>
      </View>
    );
  }

  // Route based on session state
  if (role === "driver" && driverId) {
    return <Redirect href="/(driver)/dashboard" />;
  }
  if (role === "rider" || role === "guest") {
    if (activeRideId) {
      return <Redirect href={`/(client)/track/${activeRideId}`} />;
    }
    return <Redirect href="/(client)/book" />;
  }

  // No session → show auth welcome
  return <Redirect href="/(auth)/" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  logoWrap: { alignItems: "center" },
  logoIcon: { width: 88, height: 88, borderRadius: 26, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 1, borderColor: "rgba(173,255,0,0.2)" },
  logoText: { fontSize: 32, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -1 },
});
