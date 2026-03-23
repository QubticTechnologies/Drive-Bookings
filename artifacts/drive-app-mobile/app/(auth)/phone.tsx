import { Feather } from "@expo/vector-icons";
import { useSendVerificationCode } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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
import { useI18n } from "@/contexts/i18nContext";

const COUNTRY_CODES = [
  { flag: "🇧🇸", dial: "+1 (242)", country: "Bahamas" },
  { flag: "🇺🇸", dial: "+1", country: "USA/Canada" },
  { flag: "🇬🇧", dial: "+44", country: "UK" },
  { flag: "🇩🇪", dial: "+49", country: "Germany" },
  { flag: "🇫🇷", dial: "+33", country: "France" },
];

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { setPendingPhone } = useApp();
  const [phone, setPhone] = useState("");
  const [countryIdx, setCountryIdx] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { mutate: sendCode, isPending } = useSendVerificationCode({
    mutation: {
      onSuccess: (data) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const fullPhone = `${COUNTRY_CODES[countryIdx].dial} ${phone}`.trim();
        setPendingPhone(fullPhone, data.userId);
        router.push({ pathname: "/(auth)/otp", params: { devCode: data.devCode ?? "" } });
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(t.error);
      },
    },
  });

  const handleSend = () => {
    if (phone.trim().length < 7) {
      setError(t.invalidPhone);
      return;
    }
    setError("");
    const fullPhone = `${COUNTRY_CODES[countryIdx].dial} ${phone}`.trim();
    sendCode({ data: { phoneNumber: fullPhone } });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const cc = COUNTRY_CODES[countryIdx];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>

        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconEmoji}>{cc.flag}</Text>
          </View>
          <Text style={styles.title}>{t.phoneTitle}</Text>
          <Text style={styles.sub}>{t.phoneSubtitle}</Text>
        </Animated.View>

        {/* Country cycle */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.label}>Country</Text>
          <Pressable
            style={styles.countryBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setCountryIdx((i) => (i + 1) % COUNTRY_CODES.length);
            }}
          >
            <Text style={styles.countryFlag}>{cc.flag}</Text>
            <Text style={styles.countryName}>{cc.country}</Text>
            <Text style={styles.countryDial}>{cc.dial}</Text>
            <Feather name="refresh-cw" size={14} color={COLORS.textMuted} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.inputSection}>
          <Text style={styles.label}>Phone Number</Text>
          <Pressable style={[styles.inputWrap, !!error && styles.inputError]} onPress={() => inputRef.current?.focus()}>
            <Text style={styles.dialPrefix}>{cc.dial}</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(""); }}
              placeholder="555-0100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
          </Pressable>
          {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.privacyNote}>
          <Feather name="lock" size={12} color={COLORS.textMuted} />
          <Text style={styles.privacyTxt}>Your number is never shared with drivers</Text>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Pressable
            style={[styles.sendBtn, isPending && { opacity: 0.7 }]}
            onPress={handleSend}
            disabled={isPending}
          >
            <Feather name="send" size={18} color={COLORS.bg} />
            <Text style={styles.sendBtnText}>{isPending ? t.sending : t.sendCode}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  hero: { alignItems: "center", marginBottom: 40 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.8, textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 22 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  countryBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  countryFlag: { fontSize: 22 },
  countryName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.text },
  countryDial: { fontSize: 14, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  inputSection: { marginBottom: 16 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border },
  inputError: { borderColor: COLORS.error },
  dialPrefix: { fontSize: 17, fontFamily: "Inter_500Medium", color: COLORS.textSub, marginRight: 10 },
  input: { flex: 1, fontSize: 20, fontFamily: "Inter_400Regular", color: COLORS.text, letterSpacing: 1 },
  errorTxt: { fontSize: 13, color: COLORS.error, fontFamily: "Inter_400Regular", marginTop: 6 },
  privacyNote: { flexDirection: "row", alignItems: "center", gap: 6 },
  privacyTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
  sendBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  sendBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
});
