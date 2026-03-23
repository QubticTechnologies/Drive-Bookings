import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

  const handleBack = () => {
    router.replace("/(auth)/");
  };

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
      {/* Scrollable top content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 22, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button — plain View, no animation delay blocking touches */}
        <Pressable onPress={handleBack} style={styles.back} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>

        <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={30} color={COLORS.text} />
          </View>
          <Text style={styles.title}>{t.guestTitle}</Text>
          <Text style={styles.sub}>{t.guestSubtitle}</Text>
        </Animated.View>

        {/* Perks */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.perksCard}>
          {perks.map((p, i) => (
            <View key={p.text} style={[styles.perkRow, i < perks.length - 1 && styles.perkBorder]}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={16} color={COLORS.accent} />
              </View>
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Name (optional) */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.nameSection}>
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
      </ScrollView>

      {/* Pinned bottom buttons — plain View, no animation so touches are never blocked */}
      <View style={[styles.bottomBar, { paddingBottom: botPad + 16 }]}>
        <Pressable style={styles.continueBtn} onPress={handleContinue}>
          <Ionicons name="arrow-forward-circle" size={22} color={COLORS.bg} />
          <Text style={styles.continueBtnText}>{t.continueNow}</Text>
        </Pressable>

        <Pressable style={styles.signupBtn} onPress={() => router.replace("/(auth)/phone")}>
          <Text style={styles.signupBtnText}>Create account instead</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  hero: { alignItems: "center", marginBottom: 18 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.8, textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 20 },
  perksCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  perkBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  perkIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center" },
  perkText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.text },
  nameSection: {},
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: COLORS.text },
  bottomBar: { paddingHorizontal: 22, paddingTop: 12, gap: 8, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  continueBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  continueBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
  signupBtn: { alignItems: "center", paddingVertical: 10 },
  signupBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.textSub },
});
