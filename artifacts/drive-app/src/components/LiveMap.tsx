import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { Driver } from "@workspace/api-client-react";
import { format } from "date-fns";
import L from "leaflet";

// Nassau, Bahamas center
const NASSAU_CENTER: [number, number] = [25.0480, -77.3554];
const DEFAULT_ZOOM = 13;

// Fix for Leaflet marker icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function statusColor(status: string): string {
  switch (status) {
    case "available": return "#10b981";
    case "busy": return "#f59e0b";
    default: return "#6b7280";
  }
}

// Auto-fit map to show all drivers
function FitBounds({ drivers }: { drivers: Driver[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    const positioned = drivers.filter(d => d.lastLat != null && d.lastLng != null);
    if (positioned.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(positioned.map(d => [d.lastLat!, d.lastLng!]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      fitted.current = true;
    }
  }, [drivers, map]);

  return null;
}

interface LiveMapProps {
  drivers: Driver[];
  className?: string;
}

export default function LiveMap({ drivers, className = "" }: LiveMapProps) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 ${className}`}>
      <MapContainer
        center={NASSAU_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", background: "#1a1f2e" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap dark-friendly tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds drivers={drivers} />

        {drivers.map((driver) => {
          const lat = driver.lastLat ?? (25.048 + ((driver.id * 0.003) % 0.12) - 0.06);
          const lng = driver.lastLng ?? (-77.355 + ((driver.id * 0.007) % 0.20) - 0.10);
          const color = statusColor(driver.status);

          return (
            <CircleMarker
              key={driver.id}
              center={[lat, lng]}
              radius={driver.status === "available" ? 10 : 8}
              pathOptions={{
                color: "#000",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{driver.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                    {driver.vehiclePlate} · {driver.vehicleColor} {driver.vehicleMake}
                  </div>
                  <div style={{
                    marginTop: 4,
                    display: "inline-block",
                    padding: "1px 8px",
                    borderRadius: 20,
                    fontSize: 10,
                    backgroundColor: color + "33",
                    color: color,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}>
                    {driver.status}
                  </div>
                  {driver.lastLocationUpdatedAt && (
                    <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>
                      Updated {format(new Date(driver.lastLocationUpdatedAt), "HH:mm:ss")}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-[#0d1117]/90 backdrop-blur rounded-xl p-2.5 border border-white/10 text-xs">
        {[
          { color: "#10b981", label: "Available" },
          { color: "#f59e0b", label: "Busy" },
          { color: "#6b7280", label: "Offline" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
