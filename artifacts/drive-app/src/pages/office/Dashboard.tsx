import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Radio, MapPin, Navigation, Users, Clock, CheckCircle, Car } from "lucide-react";
import {
  useListDrivers,
  useListRides,
  useUpdateRideStatus,
  Driver,
  Ride,
  UpdateRideStatusRequestStatus,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

// Nassau bounding box for the live map
const MAP_BOUNDS = { minLat: 24.98, maxLat: 25.18, minLng: -77.55, maxLng: -77.20 };

function toMapPercent(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

function statusColor(status: string) {
  switch (status) {
    case "available": return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]";
    case "busy": return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]";
    case "offline": return "bg-zinc-500";
    default: return "bg-zinc-500";
  }
}

export default function OfficeDashboard() {
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [dispatchingTo, setDispatchingTo] = useState<number | null>(null);

  const { data: drivers = [], refetch: refetchDrivers } = useListDrivers(undefined, {
    query: { refetchInterval: 4000 },
  });

  const { data: allRides = [], refetch: refetchRides } = useListRides(undefined, {
    query: { refetchInterval: 4000 },
  });

  const pendingRides = allRides.filter((r) => r.status === "pending");
  const activeRides = allRides.filter((r) => ["accepted", "in_progress"].includes(r.status));
  const availableDrivers = drivers.filter((d) => d.status === "available");

  const dispatchMutation = useUpdateRideStatus({
    mutation: {
      onSuccess: () => {
        setSelectedRide(null);
        setDispatchingTo(null);
        refetchRides();
        refetchDrivers();
      },
    },
  });

  const handleDispatch = (ride: Ride, driver: Driver) => {
    setDispatchingTo(driver.id);
    dispatchMutation.mutate({
      rideId: ride.id,
      data: { status: "accepted" as UpdateRideStatusRequestStatus, driverId: driver.id },
    });
  };

  // Drivers with known location
  const mappedDrivers = drivers.filter((d) => d.lastLat != null && d.lastLng != null);
  // Default Nassau position for drivers without location
  const defaultPos = toMapPercent(25.048, -77.355);

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Drivers", value: drivers.length, icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
            { label: "Available", value: availableDrivers.length, icon: <Radio className="w-5 h-5" />, color: "text-emerald-400" },
            { label: "Pending Rides", value: pendingRides.length, icon: <Clock className="w-5 h-5" />, color: "text-amber-400" },
            { label: "Active Rides", value: activeRides.length, icon: <Navigation className="w-5 h-5" />, color: "text-primary" },
          ].map((stat) => (
            <Card key={stat.label} className="flex items-center gap-4 py-4">
              <div className={`${stat.color} bg-white/5 p-2.5 rounded-xl`}>{stat.icon}</div>
              <div>
                <div className="text-2xl font-display font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Live Driver Map */}
          <div className="xl:col-span-3 space-y-4">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Live Driver Map
              <span className="text-xs font-normal text-muted-foreground ml-2 animate-pulse">● Updating every 4s</span>
            </h2>
            <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117]">
              {/* Grid lines for map feel */}
              <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4ade80" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Nassau label */}
              <div className="absolute bottom-3 left-4 text-xs text-muted-foreground font-mono opacity-60">
                Nassau, NP · Bahamas
              </div>

              {/* Driver dots */}
              {drivers.map((driver) => {
                const lat = driver.lastLat ?? (25.048 + (driver.id * 0.003) % 0.12 - 0.06);
                const lng = driver.lastLng ?? (-77.355 + (driver.id * 0.007) % 0.20 - 0.10);
                const pos = toMapPercent(lat, lng);
                return (
                  <motion.div
                    key={driver.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group cursor-pointer"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  >
                    {/* Pulse ring for available drivers */}
                    {driver.status === "available" && (
                      <div className="absolute inset-0 -m-2 rounded-full bg-emerald-500/20 animate-ping" />
                    )}
                    <div className={`w-4 h-4 rounded-full border-2 border-card ${statusColor(driver.status)}`} />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-max">
                      <div className="bg-card border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
                        <div className="font-bold">{driver.name}</div>
                        <div className="text-muted-foreground">{driver.vehiclePlate} · {driver.vehicleColor} {driver.vehicleMake}</div>
                        <div className="mt-1">
                          <Badge className={`text-[10px] py-0 ${driver.status === "available" ? "bg-emerald-500/20 text-emerald-400" : driver.status === "busy" ? "bg-amber-400/20 text-amber-400" : "bg-zinc-700 text-zinc-400"}`}>
                            {driver.status}
                          </Badge>
                        </div>
                        {driver.lastLocationUpdatedAt && (
                          <div className="text-muted-foreground mt-1">
                            Updated {format(new Date(driver.lastLocationUpdatedAt), "HH:mm:ss")}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Legend */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-card/80 backdrop-blur rounded-xl p-2.5 border border-white/5 text-xs">
                {[
                  { color: "bg-emerald-500", label: "Available" },
                  { color: "bg-amber-400", label: "Busy" },
                  { color: "bg-zinc-500", label: "Offline" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver List */}
            <h2 className="text-lg font-display font-bold mt-4">Fleet</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drivers.map((driver) => (
                <Card key={driver.id} className="flex items-center gap-4 py-3 px-4">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor(driver.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{driver.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{driver.vehiclePlate} · {driver.vehicleMake} {driver.vehicleModel}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{driver.totalRides} rides</div>
                    <div className="text-primary font-bold">★ {driver.rating.toFixed(1)}</div>
                  </div>
                </Card>
              ))}
              {drivers.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">No drivers registered yet.</div>
              )}
            </div>
          </div>

          {/* Bookings Panel */}
          <div className="xl:col-span-2 space-y-4">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Pending Bookings
            </h2>

            <AnimatePresence>
              {pendingRides.length === 0 ? (
                <Card className="text-center py-12 text-muted-foreground text-sm border-dashed">
                  <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-400 opacity-50" />
                  No pending bookings
                </Card>
              ) : (
                pendingRides.map((ride) => (
                  <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <Card className={`transition-all duration-200 ${selectedRide?.id === ride.id ? "border-primary/60 bg-primary/5" : "hover:border-white/20"}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg">{formatCurrency(ride.estimatedFare)}</div>
                          <div className="text-xs text-muted-foreground">{ride.distanceKm.toFixed(1)} km · {ride.clientName}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{format(new Date(ride.createdAt), "HH:mm")}</div>
                      </div>

                      <div className="flex gap-3 mb-4 text-sm">
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <div className="w-px h-5 bg-border my-0.5" />
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="text-muted-foreground truncate">{ride.pickupLocation}</div>
                          <div className="text-muted-foreground truncate">{ride.dropoffLocation}</div>
                        </div>
                      </div>

                      {selectedRide?.id === ride.id ? (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                            Select a driver to dispatch:
                          </div>
                          {availableDrivers.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-3">No available drivers right now</div>
                          ) : (
                            availableDrivers.map((driver) => (
                              <button
                                key={driver.id}
                                onClick={() => handleDispatch(ride, driver)}
                                disabled={dispatchMutation.isPending}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-white/5 hover:border-primary/30 transition-all text-left"
                              >
                                <Car className="w-4 h-4 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{driver.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{driver.vehiclePlate} · {driver.vehicleColor} {driver.vehicleMake}</div>
                                </div>
                                {dispatchingTo === driver.id && dispatchMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <div className="text-xs text-primary font-semibold">Dispatch →</div>
                                )}
                              </button>
                            ))
                          )}
                          <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setSelectedRide(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button className="w-full" size="sm" onClick={() => setSelectedRide(ride)}>
                          Dispatch Ride
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Active rides */}
            {activeRides.length > 0 && (
              <>
                <h2 className="text-lg font-display font-bold flex items-center gap-2 pt-2">
                  <Navigation className="w-5 h-5 text-primary" /> Active Rides
                </h2>
                {activeRides.map((ride) => (
                  <Card key={ride.id} className="border-primary/20 py-3 px-4">
                    <div className="flex justify-between items-center mb-2">
                      <Badge className="bg-primary/20 text-primary text-xs">{ride.status.replace("_", " ").toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{formatCurrency(ride.estimatedFare)}</span>
                    </div>
                    <div className="text-sm font-medium truncate">{ride.clientName}</div>
                    <div className="text-xs text-muted-foreground truncate">{ride.pickupLocation} → {ride.dropoffLocation}</div>
                    {ride.driver && (
                      <div className="text-xs text-primary mt-1 flex items-center gap-1">
                        <Car className="w-3 h-3" /> {ride.driver.name} · {ride.driver.vehiclePlate}
                      </div>
                    )}
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
