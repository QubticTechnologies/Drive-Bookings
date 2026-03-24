import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useI18n } from "@/contexts/i18nContext";
import { useSendVerificationCode, useVerifyCode } from "@workspace/api-client-react";

const CODE_LEN = 6;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { pendingPhone, pendingUserId, setRiderUser, activeRideId } = useApp();
  const { devCode } = useLocalSearchParams<{ devCode?: string }>();
  const [code, setCode] = useState(devCode ?? "");
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const { mutate: verify, isPending } = useVerifyCode({
    mutation: {
      onSuccess: (user) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRiderUser(user);
        if (activeRideId) {
          router.replace(`/(client)/track/${activeRideId}`);
        } else {
          router.replace("/(client)/book");
        }
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Invalid code. Please try again.");
        shakeX.value = withSequence(
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withTiming(0, { duration: 60 })
        );
      },
    },
  });

  const { mutate: resend, isPending: isResending } = useSendVerificationCode({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCode("");
        setResendTimer(30);
        setError("");
      },
    },
  });

  // useAnimatedStyle only — no `entering` prop on this view
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const handleVerify = () => {
    if (code.length !== CODE_LEN) { setError(t.invalidCode); return; }
    setError("");
    verify({ data: { phoneNumber: pendingPhone ?? "", code } });
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === CODE_LEN && !isPending) handleVerify();
  }, [code]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/")} hitSlop={12} style={styles.back}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={COLORS.accent} />
          </View>
          <Text style={styles.title}>{t.otpTitle}</Text>
          <Text style={styles.sub}>
            {t.otpSubtitle}{"\n"}
            <Text style={styles.subPhone}>{pendingPhone}</Text>
          </Text>
        </View>

        {/* OTP dots — only useAnimatedStyle (shake), no entering prop */}
        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {Array.from({ length: CODE_LEN }).map((_, i) => {
            const filled = i < code.length;
            const current = i === code.length;
            return (
              <Pressable
                key={i}
                onPress={() => inputRef.current?.focus()}
                style={[
                  styles.dot,
                  filled && styles.dotFilled,
                  current && styles.dotCurrent,
                  !!error && styles.dotError,
                ]}
              >
                <Text style={styles.dotText}>{code[i] ?? ""}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Hidden input that captures keyboard */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={(v) => {
            const filtered = v.replace(/\D/g, "").slice(0, CODE_LEN);
            setCode(filtered);
            setError("");
          }}
          keyboardType="number-pad"
          maxLength={CODE_LEN}
          autoFocus
        />

        {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

        {/* Dev code hint */}
        {devCode ? (
          <View style={styles.devHint}>
            <Feather name="terminal" size={12} color={COLORS.warning} />
            <Text style={styles.devHintTxt}>Dev code: <Text style={{ fontFamily: "Inter_700Bold" }}>{devCode}</Text></Text>
          </View>
        ) : null}

        {/* Wrong number / change */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>{t.wrongNumber} </Text>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/")} hitSlop={8}>
            <Text style={styles.resendLink}>{t.change}</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: 12 }}>
          <Pressable
            style={[styles.verifyBtn, (isPending || code.length !== CODE_LEN) && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={isPending || code.length !== CODE_LEN}
          >
            <Text style={styles.verifyBtnText}>{isPending ? t.verifying : t.verify}</Text>
          </Pressable>

          <Pressable
            style={styles.resendBtn}
            disabled={resendTimer > 0 || isResending}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              resend({ data: { phoneNumber: pendingPhone ?? "" } });
            }}
          >
            <Text style={[styles.resendBtnText, resendTimer > 0 && { color: COLORS.textMuted }]}>
              {resendTimer > 0
                ? `${t.resendIn} ${resendTimer}${t.seconds}`
                : isResending
                ? "Sending…"
                : t.resendCode}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  hero: { alignItems: "center", marginBottom: 40 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(173,255,0,0.2)" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.8, textAlign: "center", marginBottom: 12 },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 22 },
  subPhone: { fontFamily: "Inter_600SemiBold", color: COLORS.text },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 24 },
  dot: { width: 48, height: 58, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  dotFilled: { backgroundColor: COLORS.accentDim, borderColor: "rgba(173,255,0,0.4)" },
  dotCurrent: { borderColor: COLORS.accent },
  dotError: { borderColor: COLORS.error, backgroundColor: "rgba(239,68,68,0.08)" },
  dotText: { fontSize: 22, fontFamily: "Inter_700Bold", color: COLORS.text },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  errorTxt: { fontSize: 13, color: COLORS.error, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 12 },
  devHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.warningDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "center", marginBottom: 16 },
  devHintTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.warning },
  resendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  resendLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  resendLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.accent },
  verifyBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  verifyBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
  resendBtn: { alignItems: "center", paddingVertical: 12 },
  resendBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.accent },
});
