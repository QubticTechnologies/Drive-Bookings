import { Feather, Ionicons } from "@expo/vector-icons";
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
import { useI18n } from "@/contexts/i18nContext";

export default function GuestScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { setGuestMode } = useApp();
  const [name, setName] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGuestMode(name.trim() || "Guest");
    router.replace("/(client)/book");
  };

  const perks = [
    { icon: "flash-outline" as const, text: "No sign-up or password" },
    { icon: "lock-open-outline" as const, text: "Book rides instantly" },
    { icon: "person-add-outline" as const, text: "Create an account later" },
    { icon: "shield-checkmark-outline" as const, text: "Full ride protection" },
  ];

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
            <Ionicons name="person-outline" size={36} color={COLORS.text} />
          </View>
          <Text style={styles.title}>{t.guestTitle}</Text>
          <Text style={styles.sub}>{t.guestSubtitle}</Text>
        </Animated.View>

        {/* Perks */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.perksCard}>
          {perks.map((p, i) => (
            <View key={p.text} style={[styles.perkRow, i < perks.length - 1 && styles.perkBorder]}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Name (optional) */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.nameSection}>
          <Text style={styles.label}>{t.yourName}</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color={COLORS.textSub} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={FadeInDown.delay(400).springify()} style={{ gap: 12 }}>
          <Pressable style={styles.continueBtn} onPress={handleContinue}>
            <Ionicons name="arrow-forward-circle" size={22} color={COLORS.bg} />
            <Text style={styles.continueBtnText}>{t.continueNow}</Text>
          </Pressable>

          <Pressable style={styles.signupBtn} onPress={() => router.replace("/(auth)/phone")}>
            <Text style={styles.signupBtnText}>Create account instead</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  hero: { alignItems: "center", marginBottom: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.8, textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 22 },
  perksCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 28 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  perkBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  perkIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center" },
  perkText: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.text },
  nameSection: { marginBottom: 20 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: COLORS.text },
  continueBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  continueBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
  signupBtn: { alignItems: "center", paddingVertical: 12 },
  signupBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.textSub },
});
