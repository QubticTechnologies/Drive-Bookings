import { Feather, Ionicons } from "@expo/vector-icons";
import { useRegisterDriver } from "@workspace/api-client-react";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "words",
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        {icon}
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.text },
});

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { setDriver, setRole } = useApp();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    licenseNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehiclePlate: "",
    vehicleColor: "",
  });
  const [error, setError] = useState("");

  const update = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const { mutate: register, isPending } = useRegisterDriver({
    mutation: {
      onSuccess: (driver) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRole("driver");
        setDriver(driver.id, driver.name);
        router.replace("/(driver)/dashboard");
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (err?.message?.includes("23505") || err?.message?.includes("unique")) {
          setError("A driver with this email, phone, or plate already exists.");
        } else {
          setError("Registration failed. Please check your details.");
        }
      },
    },
  });

  const handleRegister = () => {
    const required = ["name", "phone", "email", "licenseNumber", "vehicleMake", "vehicleModel", "vehicleYear", "vehiclePlate", "vehicleColor"] as const;
    if (required.some((k) => !form[k].trim())) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    register({
      data: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        licenseNumber: form.licenseNumber,
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        vehicleYear: parseInt(form.vehicleYear, 10) || 2022,
        vehiclePlate: form.vehiclePlate,
        vehicleColor: form.vehicleColor,
      },
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(driver)/")} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Register as Driver</Text>
            <Text style={styles.sub}>Join Nassau's premium ride network</Text>
          </View>
        </View>

        {/* Section: Personal */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Personal Details</Text>
          </View>
          <Field label="Full Name" icon={<Feather name="user" size={16} color={COLORS.textSub} />} value={form.name} onChangeText={update("name")} placeholder="James Smith" />
          <Field label="Phone" icon={<Feather name="phone" size={16} color={COLORS.textSub} />} value={form.phone} onChangeText={update("phone")} placeholder="+1 (242) 555-0144" keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Email" icon={<Feather name="mail" size={16} color={COLORS.textSub} />} value={form.email} onChangeText={update("email")} placeholder="james@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Driver's License" icon={<Ionicons name="card-outline" size={16} color={COLORS.textSub} />} value={form.licenseNumber} onChangeText={update("licenseNumber")} placeholder="BS242DRV01" autoCapitalize="characters" />
        </Animated.View>

        {/* Section: Vehicle */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-outline" size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
          </View>
          <Field label="Make" icon={<Ionicons name="car-outline" size={16} color={COLORS.textSub} />} value={form.vehicleMake} onChangeText={update("vehicleMake")} placeholder="Toyota" />
          <Field label="Model" icon={<Feather name="tool" size={16} color={COLORS.textSub} />} value={form.vehicleModel} onChangeText={update("vehicleModel")} placeholder="Camry" />
          <Field label="Year" icon={<Feather name="calendar" size={16} color={COLORS.textSub} />} value={form.vehicleYear} onChangeText={update("vehicleYear")} placeholder="2022" keyboardType="numeric" autoCapitalize="none" />
          <Field label="License Plate" icon={<Feather name="credit-card" size={16} color={COLORS.textSub} />} value={form.vehiclePlate} onChangeText={update("vehiclePlate")} placeholder="NP 4821" autoCapitalize="characters" />
          <Field label="Color" icon={<Ionicons name="color-palette-outline" size={16} color={COLORS.textSub} />} value={form.vehicleColor} onChangeText={update("vehicleColor")} placeholder="Pearl White" />
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.registerBtn, isPending && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isPending}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.bg} />
          <Text style={styles.registerBtnText}>{isPending ? "Registering…" : "Register My Vehicle"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginTop: 4 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.8, marginBottom: 4 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  section: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.error, textAlign: "center", marginBottom: 12 },
  registerBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  registerBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
});
