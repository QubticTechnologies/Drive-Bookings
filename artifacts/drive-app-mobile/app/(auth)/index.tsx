import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
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
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { LANGUAGES, type Language, useI18n } from "@/contexts/i18nContext";

const { height } = Dimensions.get("window");

function GRLogo() {
  const box = 52;
  const r = 13;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: r,
          backgroundColor: COLORS.accentDim,
          borderWidth: 1.5,
          borderColor: COLORS.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: COLORS.accent, letterSpacing: -0.5 }}>G</Text>
      </View>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: r,
          backgroundColor: COLORS.goldDim,
          borderWidth: 1.5,
          borderColor: COLORS.gold,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: COLORS.gold, letterSpacing: -0.5 }}>R</Text>
      </View>
    </View>
  );
}

function LangModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose}>
        <Animated.View entering={FadeInDown.springify()} style={modal.sheet}>
          <Text style={modal.title}>{t.selectLanguage}</Text>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              style={[modal.option, lang.code === language && modal.optionActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setLanguage(lang.code as Language);
                onClose();
              }}
            >
              <Text style={modal.flag}>{lang.flag}</Text>
              <Text style={[modal.optionText, lang.code === language && { color: COLORS.accent }]}>
                {lang.label}
              </Text>
              {lang.code === language && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />
              )}
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 20 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 4 },
  optionActive: { backgroundColor: COLORS.accentDim },
  flag: { fontSize: 24 },
  optionText: { flex: 1, fontSize: 17, fontFamily: "Inter_500Medium", color: COLORS.text },
});

function AuthBtn({
  icon,
  label,
  sub,
  onPress,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onPress: () => void;
  accent?: boolean;
  delay: number;
}) {
  const scale = useSharedValue(1);
  // Keep entering and useAnimatedStyle on SEPARATE Animated.Views so
  // they never compete over the same transform property.
  const pressAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    scale.value = withSequence(withTiming(0.97, { duration: 70 }), withTiming(1, { duration: 70 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Animated.View style={pressAnim}>
        <Pressable
          onPress={press}
          style={[styles.authBtn, accent && styles.authBtnAccent]}
        >
          <View style={[styles.authBtnIcon, accent && styles.authBtnIconAccent]}>{icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.authBtnLabel, accent && { color: COLORS.bg }]}>{label}</Text>
            {sub && <Text style={[styles.authBtnSub, accent && { color: "rgba(0,0,0,0.5)" }]}>{sub}</Text>}
          </View>
          <Feather name="chevron-right" size={18} color={accent ? COLORS.bg : COLORS.textMuted} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const CURRENT_LANG_FLAG: Record<Language, string> = { en: "🇧🇸", es: "🇪🇸", fr: "🇫🇷" };

export default function AuthWelcome() {
  const insets = useSafeAreaInsets();
  const { t, language } = useI18n();
  const [langVisible, setLangVisible] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad + 8, paddingBottom: botPad + 24 }]}>
      {/* Background gradient — never blocks touches */}
      <LinearGradient
        colors={["rgba(0,194,212,0.10)", "rgba(255,199,44,0.04)", "transparent"]}
        style={[styles.glow, { pointerEvents: "none" }]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
      />

      {/* Top bar — just language picker */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.topBar}>
        <View />
        <Pressable
          style={styles.langBtn}
          onPress={() => { Haptics.selectionAsync(); setLangVisible(true); }}
        >
          <Text style={styles.langFlag}>{CURRENT_LANG_FLAG[language]}</Text>
          <Feather name="chevron-down" size={14} color={COLORS.textSub} />
        </Pressable>
      </Animated.View>

      {/* Hero — GR logo + GoRide name + tagline */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.hero}>
        <GRLogo />

        <View style={{ marginTop: 18, marginBottom: 4 }}>
          <Text style={styles.brandName}>GoRide</Text>
        </View>

        <View style={styles.heroBadge}>
          <View style={styles.heroBadgeDot} />
          <Text style={styles.heroBadgeText}>Nassau, Bahamas</Text>
        </View>

        {/* Trust badges */}
        <View style={styles.badges}>
          {[
            { icon: "shield-checkmark-outline" as const, text: "Safe & Insured" },
            { icon: "cash-outline" as const, text: "Fixed Fares" },
            { icon: "star-outline" as const, text: "5-Star Drivers" },
          ].map((b) => (
            <View key={b.text} style={styles.badge}>
              <Ionicons name={b.icon} size={13} color={COLORS.accent} />
              <Text style={styles.badgeText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Auth options */}
      <View style={styles.authBtns}>
        <AuthBtn
          delay={300}
          accent
          icon={<Feather name="phone" size={20} color={COLORS.bg} />}
          label={t.continueWithPhone}
          sub="+1 (242) · Verification code"
          onPress={() => router.push("/(auth)/phone")}
        />
        <AuthBtn
          delay={380}
          icon={<FontAwesome name="google" size={18} color={COLORS.textSub} />}
          label={t.continueWithGoogle}
          sub="Coming soon"
          onPress={() => {}}
        />
        <AuthBtn
          delay={440}
          icon={<FontAwesome name="apple" size={20} color={COLORS.textSub} />}
          label={t.continueWithApple}
          sub="Coming soon"
          onPress={() => {}}
        />

        <Animated.View entering={FadeInDown.delay(520).springify()} style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        <AuthBtn
          delay={580}
          icon={<Ionicons name="person-outline" size={20} color={COLORS.textSub} />}
          label={t.continueAsGuest}
          sub={t.guestNote}
          onPress={() => router.push("/(auth)/guest")}
        />
      </View>

      {/* Driver link */}
      <Animated.View entering={FadeIn.delay(700)} style={styles.driverRow}>
        <Text style={styles.driverText}>Are you a driver? </Text>
        <Pressable onPress={() => router.push("/(driver)/")}>
          <Text style={styles.driverLink}>Sign in here</Text>
        </Pressable>
      </Animated.View>

      <LangModal visible={langVisible} onClose={() => setLangVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 22 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: height * 0.5 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  langFlag: { fontSize: 18 },
  hero: { marginBottom: 28 },
  brandName: { fontSize: 38, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -1.5 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textSub, letterSpacing: 0.1, marginTop: 2, marginBottom: 18 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  heroBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: COLORS.accent, letterSpacing: 0.5 },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.accentDim, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,194,212,0.2)" },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: COLORS.accent },
  authBtns: { gap: 10 },
  authBtn: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.card, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border },
  authBtnAccent: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  authBtnIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  authBtnIconAccent: { backgroundColor: "rgba(0,0,0,0.12)" },
  authBtnLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: COLORS.text, marginBottom: 1 },
  authBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
  driverRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
  driverText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  driverLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.accent },
});
