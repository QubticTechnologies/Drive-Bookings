import { Feather, Ionicons } from "@expo/vector-icons";
import { useCreateRide } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

// ── Nassau Locations ──────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    title: "Airport & Port",
    icon: "airplane" as const,
    color: COLORS.blue,
    places: [
      { name: "Lynden Pindling Int'l Airport", hint: "Main international airport", lat: 25.0389, lng: -77.4659 },
      { name: "Nassau Cruise Port", hint: "Prince George Wharf", lat: 25.0811, lng: -77.3513 },
    ],
  },
  {
    title: "Hotels & Resorts",
    icon: "bed" as const,
    color: COLORS.warning,
    places: [
      { name: "Atlantis Paradise Island", hint: "Iconic resort on Paradise Island", lat: 25.0872, lng: -77.3149 },
      { name: "Baha Mar Resort", hint: "Cable Beach luxury complex", lat: 25.0738, lng: -77.4025 },
      { name: "Sandals Royal Bahamian", hint: "Adults-only Cable Beach resort", lat: 25.0700, lng: -77.3870 },
      { name: "British Colonial Hilton", hint: "Historic hotel, downtown", lat: 25.0800, lng: -77.3420 },
      { name: "Melia Nassau Beach", hint: "Cable Beach", lat: 25.0690, lng: -77.3950 },
    ],
  },
  {
    title: "Beaches",
    icon: "sunny" as const,
    color: COLORS.accent,
    places: [
      { name: "Cable Beach", hint: "Most popular tourist beach", lat: 25.0700, lng: -77.3900 },
      { name: "Junkanoo Beach", hint: "Free beach near cruise port", lat: 25.0780, lng: -77.3480 },
      { name: "Montagu Beach", hint: "Quiet local beach, east Nassau", lat: 25.0580, lng: -77.3000 },
      { name: "Love Beach", hint: "Snorkelling, west Nassau", lat: 25.0760, lng: -77.4700 },
      { name: "Goodman's Bay", hint: "Park & picnic beach", lat: 25.0770, lng: -77.3850 },
    ],
  },
  {
    title: "Downtown Nassau",
    icon: "business" as const,
    color: COLORS.success,
    places: [
      { name: "Parliament Square", hint: "City centre landmark", lat: 25.0770, lng: -77.3410 },
      { name: "Straw Market (Bay Street)", hint: "Souvenirs & local crafts", lat: 25.0787, lng: -77.3440 },
      { name: "Arawak Cay — Fish Fry", hint: "Best local seafood strip", lat: 25.0800, lng: -77.3600 },
      { name: "Fort Charlotte", hint: "Historic fort & gardens", lat: 25.0790, lng: -77.3650 },
    ],
  },
  {
    title: "Residential",
    icon: "home" as const,
    color: COLORS.textSub,
    places: [
      { name: "Sandyport", hint: "Western gated community", lat: 25.0750, lng: -77.4120 },
      { name: "Carmichael Road", hint: "South New Providence", lat: 25.0350, lng: -77.4000 },
      { name: "Village Road", hint: "Eastern suburbs", lat: 25.0450, lng: -77.3150 },
      { name: "Lyford Cay", hint: "Exclusive western enclave", lat: 25.0300, lng: -77.5300 },
    ],
  },
];

const QUICK_ROUTES = [
  { label: "Airport → Downtown", pickup: "Lynden Pindling Int'l Airport", dropoff: "Parliament Square" },
  { label: "Port → Atlantis", pickup: "Nassau Cruise Port", dropoff: "Atlantis Paradise Island" },
  { label: "Airport → Baha Mar", pickup: "Lynden Pindling Int'l Airport", dropoff: "Baha Mar Resort" },
  { label: "Port → Cable Beach", pickup: "Nassau Cruise Port", dropoff: "Cable Beach" },
];

type Place = { name: string; hint: string; lat: number; lng: number };

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fareStr(km: number) {
  const fare = 3 + 1.5 * km;
  return `$${fare.toFixed(2)}`;
}

function getAllPlaces(): Place[] {
  return CATEGORIES.flatMap((c) => c.places);
}

function findCoords(name: string) {
  const found = getAllPlaces().find((p) => p.name === name);
  if (found) return { lat: found.lat, lng: found.lng };
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { lat: 25.048 + (hash % 100) / 1000, lng: -77.355 + ((hash >> 2) % 100) / 1000 };
}

// ── Location Picker Modal ─────────────────────────────────────────────────────
function LocationPicker({
  visible,
  onSelect,
  onClose,
  label,
}: {
  visible: boolean;
  onSelect: (place: Place) => void;
  onClose: () => void;
  label: string;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? getAllPlaces().filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.hint.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[pickerStyles.container, { paddingBottom: insets.bottom || 16 }]}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.headerTitle}>{label}</Text>
          <Pressable onPress={onClose} style={pickerStyles.closeBtn}>
            <Feather name="x" size={22} color={COLORS.text} />
          </Pressable>
        </View>

        <View style={pickerStyles.searchBox}>
          <Feather name="search" size={16} color={COLORS.textSub} />
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search locations…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x-circle" size={16} color={COLORS.textSub} />
            </Pressable>
          )}
        </View>

        <FlatList
          data={filtered ?? CATEGORIES}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            if (filtered) {
              const place = item as Place;
              return (
                <Pressable
                  style={pickerStyles.placeRow}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelect(place);
                    setSearch("");
                    onClose();
                  }}
                >
                  <View style={pickerStyles.placeIcon}>
                    <Ionicons name="location-outline" size={16} color={COLORS.textSub} />
                  </View>
                  <View>
                    <Text style={pickerStyles.placeName}>{place.name}</Text>
                    <Text style={pickerStyles.placeHint}>{place.hint}</Text>
                  </View>
                </Pressable>
              );
            }
            const cat = item as typeof CATEGORIES[0];
            return (
              <View>
                <View style={pickerStyles.catHeader}>
                  <Ionicons name={cat.icon} size={14} color={cat.color} />
                  <Text style={[pickerStyles.catTitle, { color: cat.color }]}>{cat.title}</Text>
                </View>
                {cat.places.map((place) => (
                  <Pressable
                    key={place.name}
                    style={pickerStyles.placeRow}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelect(place);
                      setSearch("");
                      onClose();
                    }}
                  >
                    <View style={pickerStyles.placeIcon}>
                      <Ionicons name="location-outline" size={16} color={COLORS.textSub} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={pickerStyles.placeName}>{place.name}</Text>
                      <Text style={pickerStyles.placeHint}>{place.hint}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  closeBtn: { padding: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  catTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  placeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  placeName: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.text, marginBottom: 2 },
  placeHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub },
});

// ── Book Screen ───────────────────────────────────────────────────────────────
export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const { setActiveRideId } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [notes, setNotes] = useState("");
  const [pickerFor, setPickerFor] = useState<"pickup" | "dropoff" | null>(null);

  const km = pickup && dropoff ? haversine(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) : 0;

  const { mutate: createRide, isPending } = useCreateRide({
    mutation: {
      onSuccess: (data) => {
        setActiveRideId(data.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/(client)/track/${data.id}`);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    },
  });

  const handleBook = () => {
    if (!name || !phone || !pickup || !dropoff) return;
    createRide({
      data: {
        clientName: name,
        clientPhone: phone,
        pickupLocation: pickup.name,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLocation: dropoff.name,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        notes,
      },
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const canBook = !!(name && phone && pickup && dropoff && !isPending);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => { if (router.canGoBack()) router.back(); }} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={COLORS.text} />
            </Pressable>
            <View>
              <Text style={styles.screenTitle}>Request a Ride</Text>
              <Text style={styles.screenSub}>Nassau, Bahamas · Fares in USD</Text>
            </View>
          </View>

          {/* Quick routes */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {QUICK_ROUTES.map((r) => (
              <Pressable
                key={r.label}
                style={[
                  styles.chip,
                  pickup?.name === r.pickup && dropoff?.name === r.dropoff && styles.chipActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  const p = getAllPlaces().find((pl) => pl.name === r.pickup)!;
                  const d = getAllPlaces().find((pl) => pl.name === r.dropoff)!;
                  setPickup(p);
                  setDropoff(d);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    pickup?.name === r.pickup && dropoff?.name === r.dropoff && styles.chipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Your Details */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>Your Details</Text>
            <View style={styles.inputRow}>
              <Feather name="user" size={16} color={COLORS.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.inputRow}>
              <Feather name="phone" size={16} color={COLORS.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+1 (242) 555-0100"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </Animated.View>

          {/* Trip */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>Your Trip</Text>

            <Pressable style={styles.locationRow} onPress={() => setPickerFor("pickup")}>
              <View style={[styles.locDot, { backgroundColor: COLORS.blue }]} />
              <View style={styles.locInfo}>
                <Text style={pickup ? styles.locName : styles.locPlaceholder}>
                  {pickup ? pickup.name : "Pickup location"}
                </Text>
                {pickup && <Text style={styles.locHint}>{pickup.hint}</Text>}
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </Pressable>

            <View style={styles.locDivider} />

            <Pressable style={styles.locationRow} onPress={() => setPickerFor("dropoff")}>
              <View style={[styles.locDot, { backgroundColor: COLORS.accent }]} />
              <View style={styles.locInfo}>
                <Text style={dropoff ? styles.locName : styles.locPlaceholder}>
                  {dropoff ? dropoff.name : "Drop-off location"}
                </Text>
                {dropoff && <Text style={styles.locHint}>{dropoff.hint}</Text>}
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </Pressable>
          </Animated.View>

          {/* Fare estimate */}
          {km > 0 && (
            <Animated.View entering={FadeInDown.springify()} style={styles.fareCard}>
              <View>
                <Text style={styles.fareAmount}>{fareStr(km)}</Text>
                <Text style={styles.fareSub}>
                  $3.00 base + ${(1.5 * km).toFixed(2)} for {km.toFixed(1)} km
                </Text>
              </View>
              <View style={styles.fareInfo}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.textSub} />
                <Text style={styles.fareInfoText}>Confirmed at drop-off</Text>
              </View>
            </Animated.View>
          )}

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>Notes for driver (optional)</Text>
            <TextInput
              style={[styles.inputRow, styles.notesInput]}
              placeholder="E.g. I have luggage, at main entrance…"
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {["I have luggage", "Baby seat needed", "Wheelchair access", "At main entrance"].map((s) => (
                <Pressable
                  key={s}
                  style={styles.noteChip}
                  onPress={() => setNotes((n) => (n ? `${n}, ${s}` : s))}
                >
                  <Text style={styles.noteChipText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </ScrollView>

        {/* Book button */}
        <View style={[styles.bookBar, { paddingBottom: botPad + 12 }]}>
          <Pressable
            style={[styles.bookBtn, !canBook && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={!canBook}
          >
            <Ionicons name="car-sport" size={20} color={canBook ? COLORS.bg : COLORS.textMuted} />
            <Text style={[styles.bookBtnText, !canBook && { color: COLORS.textMuted }]}>
              {isPending ? "Requesting…" : "Request Ride Now"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={pickerFor === "pickup"}
        label="Choose Pickup"
        onSelect={(p) => setPickup(p)}
        onClose={() => setPickerFor(null)}
      />
      <LocationPicker
        visible={pickerFor === "dropoff"}
        label="Choose Drop-off"
        onSelect={(p) => setDropoff(p)}
        onClose={() => setPickerFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: COLORS.text, letterSpacing: -0.5 },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 2 },
  chips: { marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.accentDim, borderColor: "rgba(173,255,0,0.4)" },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  chipTextActive: { color: COLORS.accent },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.text },
  notesInput: { minHeight: 80, alignItems: "flex-start", paddingTop: 14 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, marginBottom: 2 },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  locDivider: { width: 1, height: 6, backgroundColor: COLORS.border, marginLeft: 19 },
  locInfo: { flex: 1 },
  locName: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.text },
  locPlaceholder: { fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textMuted },
  locHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 2 },
  fareCard: { backgroundColor: COLORS.accentDim, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(173,255,0,0.25)", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  fareAmount: { fontSize: 32, fontFamily: "Inter_700Bold", color: COLORS.accent, letterSpacing: -1 },
  fareSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 4 },
  fareInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  fareInfoText: { fontSize: 11, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  noteChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  noteChipText: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  bookBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  bookBtnDisabled: { backgroundColor: COLORS.card },
  bookBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
});
