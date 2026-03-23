import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
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

const { width } = Dimensions.get("window");

function PulsingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      entering={FadeIn.delay(delay)}
      style={[styles.dot, style]}
    />
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  onPress,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent: boolean;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.96, { duration: 80 }), withTiming(1, { duration: 80 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={animStyle}>
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={accent ? ["rgba(173,255,0,0.15)", "rgba(173,255,0,0.05)"] : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
          style={[styles.card, accent && styles.cardAccent]}
        >
          <View style={[styles.iconBox, accent && styles.iconBoxAccent]}>
            {icon}
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: accent ? COLORS.accent : COLORS.text }]}>
              {title}
            </Text>
            <Text style={styles.cardSub}>{subtitle}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={accent ? COLORS.accent : COLORS.textMuted} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { role, driverId, activeRideId } = useApp();

  // Resume previous session
  useEffect(() => {
    if (role === "driver" && driverId) {
      router.replace("/(driver)/dashboard");
    } else if (role === "client" && activeRideId) {
      router.replace(`/(client)/track/${activeRideId}`);
    }
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
      {/* Background glow */}
      <LinearGradient
        colors={["rgba(173,255,0,0.08)", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Logo & dots */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Ionicons name="car-sport" size={28} color={COLORS.accent} />
        </View>
        <Text style={styles.logoText}>DriveApp</Text>
      </Animated.View>

      {/* Hero */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.hero}>
        <Text style={styles.heroTitle}>Nassau's{"\n"}Ride Network</Text>
        <Text style={styles.heroSub}>
          Safe, transparent rides for visitors and locals. Fares from $3.00 USD.
        </Text>
        <View style={styles.dotsRow}>
          <PulsingDot delay={0} />
          <PulsingDot delay={300} />
          <PulsingDot delay={600} />
        </View>
      </Animated.View>

      {/* Mode cards */}
      <View style={styles.cards}>
        <ModeCard
          delay={400}
          accent={true}
          icon={<Ionicons name="location" size={24} color={COLORS.accent} />}
          title="Request a Ride"
          subtitle="Book instantly — no account needed"
          onPress={() => router.push("/(client)/book")}
        />
        <ModeCard
          delay={500}
          accent={false}
          icon={<Ionicons name="car" size={24} color={COLORS.textSub} />}
          title="Driver Dashboard"
          subtitle="Manage rides & earnings"
          onPress={() => router.push("/(driver)/")}
        />
      </View>

      {/* Footer */}
      <Animated.Text entering={FadeIn.delay(700)} style={styles.footer}>
        Nassau, Bahamas · Bahamas Dollar = USD
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  heroTitle: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: COLORS.text,
    letterSpacing: -2,
    lineHeight: 54,
    marginBottom: 16,
  },
  heroSub: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
    lineHeight: 24,
    maxWidth: width * 0.75,
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  cards: {
    gap: 12,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardAccent: {
    borderColor: "rgba(173,255,0,0.3)",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxAccent: {
    backgroundColor: COLORS.accentDim,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSub,
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
