import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MapPin, Navigation, User, Phone, Luggage, Info, ChevronDown, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateRide } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/store/use-session";
import { useToast } from "@/hooks/use-toast";
import { calculateDistanceKm, calculateEstimatedFare, formatCurrency } from "@/lib/utils";

// ── Real Nassau landmarks with GPS coordinates ──────────────────────────────
const NASSAU_PLACES: Record<string, { name: string; lat: number; lng: number; hint: string }[]> = {
  "✈️  Airport & Port": [
    { name: "Lynden Pindling Int'l Airport",  lat: 25.0389, lng: -77.4659, hint: "Main international airport" },
    { name: "Nassau Cruise Port (Prince George Wharf)", lat: 25.0811, lng: -77.3513, hint: "All cruise ships dock here" },
  ],
  "🏨  Hotels & Resorts": [
    { name: "Atlantis Paradise Island",        lat: 25.0872, lng: -77.3149, hint: "Iconic resort on Paradise Island" },
    { name: "Baha Mar Resort (Cable Beach)",   lat: 25.0738, lng: -77.4025, hint: "Luxury resort complex" },
    { name: "Sandals Royal Bahamian",          lat: 25.0700, lng: -77.3870, hint: "Adults-only Cable Beach resort" },
    { name: "British Colonial Hilton",         lat: 25.0800, lng: -77.3420, hint: "Historic hotel, downtown" },
    { name: "Comfort Suites Paradise Island",  lat: 25.0870, lng: -77.3200, hint: "Budget-friendly Paradise Island" },
    { name: "Melia Nassau Beach Resort",       lat: 25.0690, lng: -77.3950, hint: "Cable Beach" },
  ],
  "🏖️  Beaches": [
    { name: "Cable Beach",                     lat: 25.0700, lng: -77.3900, hint: "Most popular tourist beach" },
    { name: "Junkanoo Beach",                  lat: 25.0780, lng: -77.3480, hint: "Free beach, walking distance from port" },
    { name: "Montagu Beach",                   lat: 25.0580, lng: -77.3000, hint: "Quiet local beach, east Nassau" },
    { name: "Love Beach",                      lat: 25.0760, lng: -77.4700, hint: "Snorkelling spot, west Nassau" },
    { name: "Goodman's Bay",                   lat: 25.0770, lng: -77.3850, hint: "Park & picnic beach" },
  ],
  "🏛️  Downtown Nassau": [
    { name: "Parliament Square",               lat: 25.0770, lng: -77.3410, hint: "City centre landmark" },
    { name: "Straw Market (Bay Street)",       lat: 25.0787, lng: -77.3440, hint: "Souvenirs & local crafts" },
    { name: "Arawak Cay — Fish Fry",           lat: 25.0800, lng: -77.3600, hint: "Best local seafood strip" },
    { name: "Fort Charlotte",                  lat: 25.0790, lng: -77.3650, hint: "Historic fort & gardens" },
    { name: "Nassau Harbour Club & Marina",    lat: 25.0820, lng: -77.3300, hint: "East bay waterfront" },
  ],
  "🏘️  Residential Areas": [
    { name: "Sandyport",                       lat: 25.0750, lng: -77.4120, hint: "Western gated community" },
    { name: "Carmichael Road",                 lat: 25.0350, lng: -77.4000, hint: "South New Providence" },
    { name: "Soldier Road",                    lat: 25.0500, lng: -77.3400, hint: "Eastern corridor" },
    { name: "Village Road",                    lat: 25.0450, lng: -77.3150, hint: "Eastern suburbs" },
    { name: "Lyford Cay",                      lat: 25.0300, lng: -77.5300, hint: "Exclusive western enclave" },
  ],
};

const ALL_PLACES = Object.values(NASSAU_PLACES).flat();

function getCoords(name: string) {
  const found = ALL_PLACES.find(p => p.name === name);
  if (found && found.lat !== 0) return { lat: found.lat, lng: found.lng };
  // Fallback: hash-based near Nassau centre
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { lat: 25.048 + (hash % 100) / 1000, lng: -77.355 + ((hash >> 2) % 100) / 1000 };
}

// ── Popular quick-routes ────────────────────────────────────────────────────
const QUICK_ROUTES = [
  { emoji: "✈️→🏛️", label: "Airport → Downtown",   pickup: "Lynden Pindling Int'l Airport",               dropoff: "Parliament Square" },
  { emoji: "🚢→🏨", label: "Port → Atlantis",        pickup: "Nassau Cruise Port (Prince George Wharf)",    dropoff: "Atlantis Paradise Island" },
  { emoji: "✈️→🏨", label: "Airport → Baha Mar",     pickup: "Lynden Pindling Int'l Airport",               dropoff: "Baha Mar Resort (Cable Beach)" },
  { emoji: "🚢→🏖️", label: "Port → Cable Beach",     pickup: "Nassau Cruise Port (Prince George Wharf)",    dropoff: "Cable Beach" },
  { emoji: "🏖️→🍤", label: "Beach → Fish Fry",       pickup: "Cable Beach",                                 dropoff: "Arawak Cay — Fish Fry" },
];

// ── Location select component ───────────────────────────────────────────────
function LocationSelect({
  label, value, onChange, dotColor, icon
}: {
  label: string; value: string; onChange: (v: string) => void;
  dotColor: string; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return Object.entries(NASSAU_PLACES);
    const q = search.toLowerCase();
    const result: Record<string, typeof ALL_PLACES> = {};
    for (const [cat, places] of Object.entries(NASSAU_PLACES)) {
      const hits = places.filter(p => p.name.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q));
      if (hits.length) result[cat] = hits;
    }
    return Object.entries(result);
  }, [search]);

  const chosen = ALL_PLACES.find(p => p.name === value);

  return (
    <div className="relative">
      <label className="text-sm font-medium text-foreground/80 ml-1 mb-1.5 block">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center gap-3 bg-input/50 border border-border rounded-xl px-4 py-3 text-left hover:border-primary/50 transition-colors focus:outline-none focus:border-primary"
      >
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} style={{ boxShadow: dotColor.includes("blue") ? "0 0 8px rgba(59,130,246,0.7)" : "0 0 8px rgba(173,255,0,0.7)" }} />
        <span className={`flex-1 truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || "Choose a location…"}
        </span>
        {chosen && <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">{chosen.hint}</span>}
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-border">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search hotels, beaches, landmarks…"
                className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.map(([cat, places]) => (
                <div key={cat}>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-secondary/30 sticky top-0">{cat}</div>
                  {places.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => { onChange(p.name); setOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-primary/10 flex flex-col transition-colors ${value === p.name ? "bg-primary/10 text-primary" : ""}`}
                    >
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.hint}</span>
                    </button>
                  ))}
                </div>
              ))}
              {/* Always show custom option */}
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-secondary/30">📍  Custom</div>
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary/10 flex flex-col"
                >
                  <span className="text-sm font-medium">Other / Type an address</span>
                  <span className="text-xs text-muted-foreground">Enter any Nassau address manually</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual input shown when no preset chosen */}
      {value === "" && (
        <input
          type="text"
          placeholder="Type address or landmark…"
          className="mt-2 w-full bg-input/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm"
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
const NOTE_SHORTCUTS = ["I have luggage 🧳", "Baby seat needed 👶", "Wheelchair access ♿", "I'll be at the entrance 🚪", "Meet me inside 🏠"];

export default function ClientBook() {
  const [, setLocation] = useLocation();
  const { setMode, setClientDetails, setActiveRideId, clientDetails } = useSession();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clientName: clientDetails?.name || "",
    clientPhone: clientDetails?.phone || "",
    pickupLocation: "",
    dropoffLocation: "",
    notes: ""
  });

  const pickupCoords  = useMemo(() => getCoords(formData.pickupLocation),  [formData.pickupLocation]);
  const dropoffCoords = useMemo(() => getCoords(formData.dropoffLocation), [formData.dropoffLocation]);

  const distance = (formData.pickupLocation && formData.dropoffLocation)
    ? calculateDistanceKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng)
    : 0;
  const estFare = calculateEstimatedFare(distance);

  const createMutation = useCreateRide({
    mutation: {
      onSuccess: (data) => {
        setMode("client");
        setClientDetails({ name: formData.clientName, phone: formData.clientPhone });
        setActiveRideId(data.id);
        toast({ title: "Ride Requested!", description: "Finding the nearest driver for you…" });
        setLocation(`/client/ride/${data.id}`);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Could not book ride. Please try again.", variant: "destructive" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pickupLocation || !formData.dropoffLocation) {
      toast({ title: "Missing locations", description: "Please choose both a pickup and drop-off location.", variant: "destructive" });
      return;
    }
    if (formData.pickupLocation === formData.dropoffLocation) {
      toast({ title: "Same location", description: "Pickup and drop-off must be different.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      data: {
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        pickupLocation: formData.pickupLocation,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffLocation: formData.dropoffLocation,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        notes: formData.notes,
      }
    });
  };

  const applyQuickRoute = (pickup: string, dropoff: string) => {
    setFormData(f => ({ ...f, pickupLocation: pickup, dropoffLocation: dropoff }));
  };

  const addNote = (snippet: string) => {
    setFormData(f => ({
      ...f,
      notes: f.notes ? `${f.notes}\n${snippet}` : snippet
    }));
  };

  const canSubmit = formData.clientName && formData.clientPhone && formData.pickupLocation && formData.dropoffLocation;

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ── Form panel (3/5 width on xl) ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-3 space-y-5"
        >
          {/* Hero */}
          <div>
            <h1 className="text-3xl font-display font-bold">Where are you headed?</h1>
            <p className="text-muted-foreground mt-1">
              Safe, reliable rides across Nassau — for visitors & locals alike. <span className="text-primary font-medium">Fares in USD.</span>
            </p>
          </div>

          {/* Popular routes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Popular routes</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ROUTES.map(r => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => applyQuickRoute(r.pickup, r.dropoff)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:border-primary hover:text-primary ${
                    formData.pickupLocation === r.pickup && formData.dropoffLocation === r.dropoff
                      ? "bg-primary/15 border-primary text-primary"
                      : "border-border text-muted-foreground bg-secondary/30"
                  }`}
                >
                  <span>{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main form card */}
          <Card className="backdrop-blur-3xl bg-card/80">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Personal details */}
              <div className="grid grid-cols-2 gap-4 pb-5 border-b border-border">
                <Input
                  name="clientName" label="Your Name"
                  icon={<User className="w-4 h-4" />}
                  value={formData.clientName}
                  onChange={e => setFormData(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Jane Smith"
                  required
                />
                <div>
                  <Input
                    name="clientPhone" label="Phone Number"
                    icon={<Phone className="w-4 h-4" />}
                    value={formData.clientPhone}
                    onChange={e => setFormData(f => ({ ...f, clientPhone: e.target.value }))}
                    placeholder="+1 (242) 555-0100"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1 ml-1">Include country code if international (e.g. +44, +1)</p>
                </div>
              </div>

              {/* Location selectors */}
              <div className="space-y-4 relative">
                <div className="absolute left-[7px] top-11 bottom-11 w-0.5 bg-border z-0 hidden sm:block" />

                <LocationSelect
                  label="📍  Pickup Location"
                  value={formData.pickupLocation}
                  onChange={v => setFormData(f => ({ ...f, pickupLocation: v }))}
                  dotColor="bg-blue-500"
                />

                <LocationSelect
                  label="🏁  Drop-off Location"
                  value={formData.dropoffLocation}
                  onChange={v => setFormData(f => ({ ...f, dropoffLocation: v }))}
                  dotColor="bg-primary"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground/80 ml-1 mb-2 block">Notes for your driver <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[70px] text-sm"
                  placeholder="E.g. I'm at the main entrance with luggage…"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NOTE_SHORTCUTS.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => addNote(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fare summary + Book button */}
              <div className="bg-secondary/40 rounded-2xl p-5 border border-white/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Estimated Fare</div>
                    <div className="text-4xl font-display font-bold text-primary">
                      {distance > 0 ? formatCurrency(estFare) : "—"}
                    </div>
                    {distance > 0 && (
                      <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                        <div>$3.00 base + ${(estFare - 3).toFixed(2)} distance ({distance.toFixed(1)} km)</div>
                        <div className="text-primary/70">Final fare is confirmed at drop-off</div>
                      </div>
                    )}
                    {distance === 0 && (
                      <div className="text-xs text-muted-foreground mt-1">Select pickup & drop-off to see estimate</div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground leading-relaxed">
                    <div>$3.00 base fare</div>
                    <div>+ $1.50 per km</div>
                    <div className="text-primary/80 mt-1">USD only</div>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={createMutation.isPending}
                  disabled={!canSubmit}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {canSubmit ? "Request Ride Now" : "Fill in all fields above"}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* ── Tips & info panel (2/5 width on xl) ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="xl:col-span-2 space-y-4"
        >
          {/* Tourist welcome card */}
          <Card className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Welcome to Nassau 🌴</h3>
                <p className="text-sm text-muted-foreground">Here's what to know before your ride</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                { icon: "💵", text: "All fares are in US Dollars (USD)" },
                { icon: "📱", text: "Your driver will call or text you when nearby" },
                { icon: "🏷️", text: "The fare shown is an estimate — confirmed at drop-off" },
                { icon: "🧾", text: "An invoice is generated automatically after your trip" },
                { icon: "🔒", text: "Fully licensed and insured drivers" },
                { icon: "⏱️", text: "Average wait time: 5–10 minutes" },
              ].map(tip => (
                <li key={tip.icon} className="flex items-start gap-2.5">
                  <span className="text-base leading-tight">{tip.icon}</span>
                  <span className="text-muted-foreground leading-snug">{tip.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Luggage & accessibility */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Luggage className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Need something special?</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Use the quick-note buttons in the form to let your driver know in advance.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="bg-secondary/40 rounded-lg p-2.5 text-center">🧳 Large luggage<br/><span className="text-primary/80">Always mention it</span></div>
              <div className="bg-secondary/40 rounded-lg p-2.5 text-center">👶 Baby seat<br/><span className="text-primary/80">Request in notes</span></div>
              <div className="bg-secondary/40 rounded-lg p-2.5 text-center">♿ Accessibility<br/><span className="text-primary/80">Request in notes</span></div>
              <div className="bg-secondary/40 rounded-lg p-2.5 text-center">🐾 Pet-friendly<br/><span className="text-primary/80">Mention in notes</span></div>
            </div>
          </Card>

          {/* Popular areas card */}
          <Card>
            <h3 className="font-semibold text-sm mb-3">📌 First time in Nassau?</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="text-foreground font-medium">From the airport:</span> ~25 min to Cable Beach, ~30 min to Atlantis, ~20 min to downtown.</p>
              <p><span className="text-foreground font-medium">From the cruise port:</span> Walking distance to Straw Market. Short ride to Cable Beach or Atlantis.</p>
              <p><span className="text-foreground font-medium">Currency:</span> Bahamian Dollar = US Dollar (1:1). USD accepted everywhere.</p>
              <p><span className="text-foreground font-medium">Tipping:</span> Not required, but appreciated for exceptional service.</p>
            </div>
          </Card>
        </motion.div>

      </div>
    </Layout>
  );
}
