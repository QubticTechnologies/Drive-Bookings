import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberNumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

// Generate deterministic-ish coordinates for a location string near London
export function simulateCoordinates(locationName: string) {
  const baseLat = 51.5072;
  const baseLng = -0.1276;
  
  // Create a pseudo-random offset based on string characters
  let hash = 0;
  for (let i = 0; i < locationName.length; i++) {
    hash = locationName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Offset by roughly +/- 0.1 degrees (approx 11km)
  const latOffset = (hash % 100) / 1000;
  const lngOffset = ((hash >> 2) % 100) / 1000;
  
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset
  };
}

// Haversine formula to calculate distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Calculate estimated fare
export function calculateEstimatedFare(distanceKm: number) {
  const baseFare = 3.00;
  const perKmRate = 1.50;
  return baseFare + (distanceKm * perKmRate);
}
