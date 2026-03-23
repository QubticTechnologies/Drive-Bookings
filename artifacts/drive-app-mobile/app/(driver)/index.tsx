import { Feather, Ionicons } from "@expo/vector-icons";
import { useDriverLogin } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

export default function DriverLoginScreen() {
  const insets = useSafeAreaInsets();
  const { setDriver, setRole } = useApp();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const { mutate: login, isPending } = useDriverLogin({
    mutation: {
      onSuccess: (driver) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRole("driver");
        setDriver(driver.id, driver.name);
        router.replace("/(driver)/dashboard");
      },
      onError: () => {
        setError("No driver account found with that phone number.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const handleLogin = () => {
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    setError("");
    login({ data: { phone: phone.trim() } });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>

        {/* Icon & title */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="car-sport" size={40} color={COLORS.text} />
          </View>
          <Text style={styles.title}>Driver Login</Text>
          <Text style={styles.sub}>Enter your registered phone number to access your dashboard</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputWrap, error ? { borderColor: COLORS.error } : {}]}>
            <Feather name="phone" size={18} color={COLORS.textSub} />
            <TextInput
              style={styles.input}
              placeholder="+1 (242) 555-0100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(""); }}
              autoFocus
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.loginBtn, isPending && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isPending}
          >
            <Text style={styles.loginBtnText}>{isPending ? "Signing in…" : "Sign In to Dashboard"}</Text>
            <Feather name="arrow-right" size={18} color={COLORS.bg} />
          </Pressable>
        </Animated.View>

        {/* Register link */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.registerWrap}>
          <Text style={styles.registerText}>New driver? </Text>
          <Pressable onPress={() => router.push("/(driver)/register")}>
            <Text style={styles.registerLink}>Register your vehicle</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 40 },
  hero: { alignItems: "center", marginBottom: 48 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 32, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -1, marginBottom: 10, textAlign: "center" },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 22 },
  form: { gap: 10, marginBottom: 24 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 17, fontFamily: "Inter_400Regular", color: COLORS.text },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.error, marginTop: 4 },
  loginBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  loginBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
  registerWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  registerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  registerLink: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: COLORS.accent },
});
