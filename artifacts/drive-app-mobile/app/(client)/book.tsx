import { Feather, Ionicons } from "@expo/vector-icons";
import { useCreateRide } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
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

// ── Nominatim helpers ─────────────────────────────────────────────────────────
const NOMINATIM_HEADERS = { "User-Agent": "GoRide/1.0 goride-nassau" };

async function nominatimSearch(query: string): Promise<Place[]> {
  const q = encodeURIComponent(query.trim() + " Nassau Bahamas");
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  const data: any[] = await res.json();
  return data.map((r) => ({
    name: r.display_name.split(",")[0].trim(),
    hint: r.display_name.split(",").slice(1, 3).join(",").trim(),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

async function nominatimReverse(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  const data = await res.json();
  return data.display_name?.split(",")[0] || "My Location";
}

function parseLocationText(text: string): { lat: number; lng: number } | null {
  const coord = text.match(/(-?\d{1,3}\.?\d*)[,\s]+(-?\d{1,3}\.?\d*)/);
  if (coord) {
    const lat = parseFloat(coord[1]), lng = parseFloat(coord[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }
  for (const pat of [/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, /@(-?\d+\.?\d*),(-?\d+\.?\d*)/, /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/]) {
    const m = text.match(pat);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

// ── Location Picker Modal ─────────────────────────────────────────────────────
type PickerTab = "places" | "search" | "gps" | "paste";

function LocationPicker({
  visible, onSelect, onClose, label, allowGps = false,
}: {
  visible: boolean;
  onSelect: (place: Place) => void;
  onClose: () => void;
  label: string;
  allowGps?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PickerTab>("places");
  const [filter, setFilter] = useState("");

  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsResult, setGpsResult] = useState<Place | null>(null);
  const [gpsLandmark, setGpsLandmark] = useState<{ place: Place; distM: number } | null>(null);
  const [gpsErr, setGpsErr] = useState("");

  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<Place | null>(null);
  const [pasteErr, setPasteErr] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);

  const reset = () => {
    setFilter(""); setSearchQ(""); setSearchResults([]); setSearchErr("");
    setGpsResult(null); setGpsLandmark(null); setGpsErr("");
    setPasteText(""); setPasteResult(null); setPasteErr("");
    setTab("places");
  };

  // Auto-fire GPS as soon as user switches to the GPS tab
  useEffect(() => {
    if (tab === "gps" && allowGps && !gpsResult && !gpsLoading) {
      doGps();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleClose = () => { reset(); onClose(); };
  const handleSelect = (place: Place) => {
    Haptics.selectionAsync();
    onSelect(place);
    reset();
    onClose();
  };

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true); setSearchErr(""); setSearchResults([]);
    try {
      const results = await nominatimSearch(searchQ);
      setSearchResults(results);
      if (results.length === 0) setSearchErr("No results found. Try a broader term.");
    } catch { setSearchErr("Search failed. Check your connection."); }
    setSearching(false);
  };

  const doGps = async () => {
    setGpsLoading(true); setGpsErr(""); setGpsResult(null); setGpsLandmark(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setGpsErr("Location permission denied. Enable it in Settings."); setGpsLoading(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const name = await nominatimReverse(lat, lng);
      setGpsResult({ name, hint: `${lat.toFixed(5)}, ${lng.toFixed(5)} · ±${Math.round(accuracy ?? 0)}m`, lat, lng });
      // Find nearest Nassau landmark
      const allPlaces = getAllPlaces();
      let nearestPlace: Place | null = null;
      let nearestDist = Infinity;
      for (const p of allPlaces) {
        const d = haversine(lat, lng, p.lat, p.lng) * 1000; // metres
        if (d < nearestDist) { nearestDist = d; nearestPlace = p; }
      }
      if (nearestPlace) setGpsLandmark({ place: nearestPlace, distM: Math.round(nearestDist) });
    } catch { setGpsErr("Could not get your location. Please try again."); }
    setGpsLoading(false);
  };

  const doPaste = async () => {
    setPasteErr(""); setPasteResult(null); setPasteLoading(true);
    const coords = parseLocationText(pasteText);
    if (!coords) { setPasteErr("Could not read location. Try: 25.0872, -77.3149"); setPasteLoading(false); return; }
    try {
      const name = await nominatimReverse(coords.lat, coords.lng);
      setPasteResult({ name, hint: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, lat: coords.lat, lng: coords.lng });
    } catch {
      setPasteResult({ name: "Custom Location", hint: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, lat: coords.lat, lng: coords.lng });
    }
    setPasteLoading(false);
  };

  const tabs = [
    { id: "places" as PickerTab, label: "Places", icon: "map" as const },
    { id: "search" as PickerTab, label: "Search", icon: "search" as const },
    ...(allowGps ? [{ id: "gps" as PickerTab, label: "My Location", icon: "navigation" as const }] : []),
    { id: "paste" as PickerTab, label: "Paste Link", icon: "link" as const },
  ];

  const filteredPlaces = filter.trim()
    ? getAllPlaces().filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()) || p.hint.toLowerCase().includes(filter.toLowerCase()))
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[pickerStyles.container, { paddingBottom: insets.bottom || 16 }]}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.headerTitle}>{label}</Text>
          <Pressable onPress={handleClose} style={pickerStyles.closeBtn} hitSlop={12}>
            <Feather name="x" size={22} color={COLORS.text} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pickerStyles.tabBar}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
          {tabs.map((t) => (
            <Pressable key={t.id} style={[pickerStyles.tab, tab === t.id && pickerStyles.tabActive]} onPress={() => setTab(t.id)}>
              <Feather name={t.icon} size={13} color={tab === t.id ? COLORS.bg : COLORS.textSub} />
              <Text style={[pickerStyles.tabText, tab === t.id && pickerStyles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── PLACES ── */}
        {tab === "places" && (
          <View style={{ flex: 1 }}>
            <View style={pickerStyles.searchBox}>
              <Feather name="search" size={16} color={COLORS.textSub} />
              <TextInput style={pickerStyles.searchInput} placeholder="Filter places…"
                placeholderTextColor={COLORS.textMuted} value={filter} onChangeText={setFilter} />
              {filter.length > 0 && <Pressable onPress={() => setFilter("")} hitSlop={8}><Feather name="x-circle" size={16} color={COLORS.textSub} /></Pressable>}
            </View>
            <FlatList style={{ flex: 1 }} data={filteredPlaces ?? CATEGORIES} keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                if (filteredPlaces) {
                  const place = item as Place;
                  return (
                    <Pressable style={pickerStyles.placeRow} onPress={() => handleSelect(place)}>
                      <View style={[pickerStyles.placeIcon, { marginRight: 14 }]}><Ionicons name="location-outline" size={16} color={COLORS.textSub} /></View>
                      <View style={{ flex: 1 }}><Text style={pickerStyles.placeName}>{place.name}</Text><Text style={pickerStyles.placeHint}>{place.hint}</Text></View>
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
                      <Pressable key={place.name} style={pickerStyles.placeRow} onPress={() => handleSelect(place)}>
                        <View style={[pickerStyles.placeIcon, { marginRight: 14 }]}><Ionicons name="location-outline" size={16} color={COLORS.textSub} /></View>
                        <View style={{ flex: 1 }}><Text style={pickerStyles.placeName}>{place.name}</Text><Text style={pickerStyles.placeHint}>{place.hint}</Text></View>
                      </Pressable>
                    ))}
                  </View>
                );
              }}
            />
          </View>
        )}

        {/* ── SEARCH ── */}
        {tab === "search" && (
          <View style={pickerStyles.tabContent}>
            <Text style={pickerStyles.tabHint}>Search any address in Nassau or the Bahamas</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[pickerStyles.searchBox, { flex: 1, marginBottom: 0 }]}>
                <Feather name="search" size={16} color={COLORS.textSub} />
                <TextInput style={pickerStyles.searchInput} placeholder="e.g. Carmichael Road, Fish Fry…"
                  placeholderTextColor={COLORS.textMuted} value={searchQ} onChangeText={setSearchQ}
                  autoFocus returnKeyType="search" onSubmitEditing={doSearch} />
              </View>
              <Pressable style={pickerStyles.searchBtn} onPress={doSearch}>
                {searching ? <ActivityIndicator size="small" color={COLORS.bg} /> : <Feather name="arrow-right" size={18} color={COLORS.bg} />}
              </Pressable>
            </View>
            {searchErr ? <Text style={pickerStyles.errorText}>{searchErr}</Text> : null}
            <FlatList data={searchResults} keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, marginTop: 12 }}
              renderItem={({ item }) => (
                <Pressable style={pickerStyles.placeRow} onPress={() => handleSelect(item)}>
                  <View style={pickerStyles.placeIcon}><Feather name="map-pin" size={16} color={COLORS.accent} /></View>
                  <View style={{ flex: 1 }}><Text style={pickerStyles.placeName}>{item.name}</Text><Text style={pickerStyles.placeHint}>{item.hint}</Text></View>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* ── GPS ── */}
        {tab === "gps" && (
          <ScrollView style={pickerStyles.tabContent} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Loading state */}
            {gpsLoading && (
              <View style={{ alignItems: "center", paddingTop: 32, gap: 16 }}>
                <View style={pickerStyles.gpsIcon}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
                <Text style={pickerStyles.gpsTitle}>Detecting Your Location…</Text>
                <Text style={pickerStyles.gpsHint}>Finding the best GPS fix — this takes just a moment.</Text>
              </View>
            )}

            {/* Error state */}
            {!gpsLoading && gpsErr ? (
              <View style={{ alignItems: "center", paddingTop: 32, gap: 16 }}>
                <View style={[pickerStyles.gpsIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                  <Feather name="alert-circle" size={32} color="#ff6b6b" />
                </View>
                <Text style={pickerStyles.errorText}>{gpsErr}</Text>
                <Pressable style={pickerStyles.actionBtn} onPress={doGps}>
                  <Feather name="refresh-cw" size={18} color={COLORS.bg} />
                  <Text style={pickerStyles.actionBtnText}>Try Again</Text>
                </Pressable>
              </View>
            ) : null}

            {/* GPS found — two confirm options */}
            {!gpsLoading && gpsResult && (
              <>
                {/* Exact GPS card */}
                <View style={pickerStyles.gpsCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <View style={[pickerStyles.gpsIconSm, { backgroundColor: COLORS.accentDim }]}>
                      <Feather name="crosshair" size={16} color={COLORS.accent} />
                    </View>
                    <Text style={pickerStyles.gpsCardTitle}>📍 Your Location Found</Text>
                  </View>
                  <Text style={pickerStyles.placeName}>{gpsResult.name}</Text>
                  <Text style={[pickerStyles.placeHint, { marginTop: 3, marginBottom: 14 }]}>{gpsResult.hint}</Text>
                  <Pressable style={pickerStyles.actionBtn} onPress={() => handleSelect(gpsResult!)}>
                    <Feather name="check" size={18} color={COLORS.bg} />
                    <Text style={pickerStyles.actionBtnText}>Use My Exact Location</Text>
                  </Pressable>
                </View>

                {/* Nearest landmark card */}
                {gpsLandmark && (
                  <View style={[pickerStyles.gpsCard, { marginTop: 14, backgroundColor: COLORS.cardElevated }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <View style={[pickerStyles.gpsIconSm, { backgroundColor: COLORS.warningDim }]}>
                        <Feather name="map-pin" size={16} color={COLORS.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={pickerStyles.gpsCardTitle}>Nearest Landmark</Text>
                        <Text style={[pickerStyles.placeHint, { marginTop: 1 }]}>
                          {gpsLandmark.distM < 1000
                            ? `${gpsLandmark.distM}m away`
                            : `${(gpsLandmark.distM / 1000).toFixed(1)}km away`}
                        </Text>
                      </View>
                    </View>
                    <Text style={pickerStyles.placeName}>{gpsLandmark.place.name}</Text>
                    <Text style={[pickerStyles.placeHint, { marginTop: 3, marginBottom: 14 }]}>{gpsLandmark.place.hint}</Text>
                    <Pressable
                      style={[pickerStyles.actionBtn, { backgroundColor: COLORS.cardElevated, borderWidth: 1, borderColor: COLORS.border }]}
                      onPress={() => handleSelect(gpsLandmark.place)}
                    >
                      <Feather name="map-pin" size={18} color={COLORS.warning} />
                      <Text style={[pickerStyles.actionBtnText, { color: COLORS.warning }]}>
                        Use {gpsLandmark.place.name.split(" ")[0]}…
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Retry link */}
                <Pressable style={{ alignItems: "center", marginTop: 16 }} onPress={doGps}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub }}>
                    Refresh GPS fix
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        )}

        {/* ── PASTE ── */}
        {tab === "paste" && (
          <View style={pickerStyles.tabContent}>
            <Text style={pickerStyles.tabHint}>Paste a Google Maps link or coordinates someone sent you</Text>
            <View style={pickerStyles.pasteBox}>
              <TextInput style={pickerStyles.pasteInput}
                placeholder={"25.0872, -77.3149\n— or —\nhttps://maps.google.com/..."}
                placeholderTextColor={COLORS.textMuted} value={pasteText}
                onChangeText={(v) => { setPasteText(v); setPasteResult(null); setPasteErr(""); }}
                multiline autoCapitalize="none" autoCorrect={false} />
            </View>
            <Pressable style={pickerStyles.actionBtn} onPress={doPaste} disabled={pasteLoading || !pasteText.trim()}>
              {pasteLoading ? <ActivityIndicator color={COLORS.bg} /> : <><Feather name="check" size={18} color={COLORS.bg} /><Text style={pickerStyles.actionBtnText}>Confirm Location</Text></>}
            </Pressable>
            {pasteErr ? <Text style={pickerStyles.errorText}>{pasteErr}</Text> : null}
            {pasteResult && (
              <View style={pickerStyles.resultRow}>
                <Feather name="map-pin" size={20} color={COLORS.accent} />
                <View style={{ flex: 1 }}><Text style={pickerStyles.placeName}>{pasteResult.name}</Text><Text style={pickerStyles.placeHint}>{pasteResult.hint}</Text></View>
                <Pressable style={pickerStyles.useBtn} onPress={() => handleSelect(pasteResult!)}>
                  <Text style={pickerStyles.useBtnText}>Use This</Text>
                </Pressable>
              </View>
            )}
            <View style={pickerStyles.pasteHints}>
              <Text style={pickerStyles.pasteHintsTitle}>Accepted formats:</Text>
              <Text style={pickerStyles.pasteHintItem}>• Coordinates: 25.0872, -77.3149</Text>
              <Text style={pickerStyles.pasteHintItem}>• Google Maps link (tap Share → Copy Link)</Text>
              <Text style={pickerStyles.pasteHintItem}>• Apple Maps / WhatsApp location</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  closeBtn: { padding: 4 },
  tabBar: { flexGrow: 0 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  tabTextActive: { color: COLORS.bg },
  tabContent: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  tabHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginBottom: 14, lineHeight: 19 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 12, backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  catTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  placeRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  placeIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  placeName: { fontSize: 15, fontFamily: "Inter_500Medium", color: COLORS.text, marginBottom: 2 },
  placeHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ff6b6b", marginTop: 10, textAlign: "center" },
  gpsIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  gpsIconSm: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  gpsTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: COLORS.text, marginBottom: 8 },
  gpsHint: { fontSize: 14, fontFamily: "Inter_400Regular", color: COLORS.textSub, textAlign: "center", lineHeight: 20, marginBottom: 12, paddingHorizontal: 10 },
  gpsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  gpsCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: COLORS.text },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, marginTop: 4 },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 20, borderWidth: 1, borderColor: COLORS.border, width: "100%" },
  useBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.accent, borderRadius: 10 },
  useBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
  pasteBox: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, minHeight: 90 },
  pasteInput: { color: COLORS.text, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  pasteHints: { marginTop: 20, padding: 16, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  pasteHintsTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  pasteHintItem: { fontSize: 13, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginBottom: 4 },
});

// ── Book Screen ───────────────────────────────────────────────────────────────
export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const { setActiveRideId, role, guestName, riderUser } = useApp();

  const riderFullName = riderUser ? [riderUser.firstName, riderUser.lastName].filter(Boolean).join(" ") : "";
  const [name, setName] = useState(riderFullName || guestName || "");
  const [phone, setPhone] = useState(riderUser?.phoneNumber ?? "");
  const [formError, setFormError] = useState("");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [notes, setNotes] = useState("");
  const [pickerFor, setPickerFor] = useState<"pickup" | "dropoff" | null>(null);
  const [bookMode, setBookMode] = useState<"now" | "later">("now");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");

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
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!phone.trim()) { setFormError("Please enter your phone number."); return; }
    if (!pickup) { setFormError("Please select a pickup location."); return; }
    if (!dropoff) { setFormError("Please select a drop-off location."); return; }
    setFormError("");
    let scheduledAt: string | undefined;
    if (bookMode === "later") {
      if (!schedDate || !schedTime) return;
      const isoStr = `${schedDate}T${schedTime}`;
      if (new Date(isoStr) <= new Date()) return;
      scheduledAt = isoStr;
    }
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
        ...(scheduledAt ? { scheduledAt } : {}),
      } as any,
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const schedValid = bookMode === "now" || (schedDate.length === 10 && schedTime.length >= 5 && new Date(`${schedDate}T${schedTime}`) > new Date());
  const canBook = !!(name && phone && pickup && dropoff && !isPending && schedValid);

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
          <Animated.View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Details</Text>
            <View style={styles.inputRow}>
              <Feather name="user" size={16} color={COLORS.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Sarah Brown"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.inputRow}>
              <Feather name="phone" size={16} color={COLORS.textSub} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. +1 (242) 555-0100"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </Animated.View>

          {/* Trip */}
          <Animated.View style={styles.section}>
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
            <Animated.View style={styles.fareCard}>
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
          <Animated.View style={styles.section}>
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

          {/* Booking mode */}
          <Animated.View style={[styles.section, { marginBottom: 32 }]}>
            <Text style={styles.sectionLabel}>When do you need the ride?</Text>
            <View style={styles.bookModeRow}>
              <Pressable
                style={[styles.bookModeBtn, bookMode === "now" && styles.bookModeBtnActive]}
                onPress={() => { setBookMode("now"); Haptics.selectionAsync(); }}
              >
                <Ionicons name="flash" size={16} color={bookMode === "now" ? "#050d0f" : COLORS.textSub} />
                <Text style={[styles.bookModeTxt, bookMode === "now" && styles.bookModeTxtActive]}>Book Now</Text>
              </Pressable>
              <Pressable
                style={[styles.bookModeBtn, bookMode === "later" && styles.bookModeBtnActive]}
                onPress={() => { setBookMode("later"); Haptics.selectionAsync(); }}
              >
                <Ionicons name="calendar-outline" size={16} color={bookMode === "later" ? "#050d0f" : COLORS.textSub} />
                <Text style={[styles.bookModeTxt, bookMode === "later" && styles.bookModeTxtActive]}>Schedule</Text>
              </Pressable>
            </View>
            {bookMode === "now" && (
              <Text style={styles.bookModeHint}>⚡ Immediate pickup · avg 3-min wait in Nassau</Text>
            )}
            {bookMode === "later" && (
              <View style={{ marginTop: 12, gap: 10 }}>
                <TextInput
                  style={styles.inputRow}
                  placeholder="e.g. 2025-12-25"
                  placeholderTextColor={COLORS.textMuted}
                  value={schedDate}
                  onChangeText={setSchedDate}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                <TextInput
                  style={styles.inputRow}
                  placeholder="Time — HH:MM  (24h, e.g. 09:00)"
                  placeholderTextColor={COLORS.textMuted}
                  value={schedTime}
                  onChangeText={setSchedTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Text style={styles.bookModeHint}>✅ Guaranteed availability · up to 30 days ahead</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Book button */}
        <View style={[styles.bookBar, { paddingBottom: botPad + 12 }]}>
          {!!formError && (
            <View style={{ backgroundColor: "#ff4d4f22", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: "#ff4d4f55" }}>
              <Text style={{ color: "#ff6b6b", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" }}>{formError}</Text>
            </View>
          )}
          <Pressable
            style={[styles.bookBtn, isPending && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={isPending}
          >
            <Ionicons
              name={bookMode === "later" ? "calendar" : "car-sport"}
              size={20}
              color={isPending ? COLORS.textMuted : COLORS.bg}
            />
            <Text style={[styles.bookBtnText, isPending && { color: COLORS.textMuted }]}>
              {isPending ? "Requesting…" : bookMode === "later" ? "Confirm Scheduled Ride" : "Request Ride Now"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={pickerFor === "pickup"}
        label="Choose Pickup"
        onSelect={(p) => setPickup(p)}
        onClose={() => setPickerFor(null)}
        allowGps
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
  bookModeRow: { flexDirection: "row", gap: 10 },
  bookModeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  bookModeBtnActive: { backgroundColor: "#00C2D4", borderColor: "#00C2D4" },
  bookModeTxt: { fontSize: 14, fontFamily: "Inter_500Medium", color: COLORS.textSub },
  bookModeTxtActive: { color: "#050d0f" },
  bookModeHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: COLORS.textSub, marginTop: 8 },
  bookBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookBtn: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  bookBtnDisabled: { backgroundColor: COLORS.card },
  bookBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: COLORS.bg },
});
