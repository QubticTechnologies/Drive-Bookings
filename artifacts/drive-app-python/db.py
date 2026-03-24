import os
import re
import math
import requests
import psycopg2
import psycopg2.extras
from datetime import datetime

BASE_FARE = 3.0
PER_KM = 1.50
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"
HEADERS = {"User-Agent": "GoRide-Nassau/1.0 (contact@goride.bs)"}
# Nassau / New Providence bounding box
NASSAU_BBOX = "-77.7,24.85,-77.0,25.25"


def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    return conn


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calc_fare(km: float) -> float:
    return round(BASE_FARE + PER_KM * km, 2)


def fmt_usd(amount: float) -> str:
    return f"${amount:,.2f}"


# ── Geocoding (OpenStreetMap Nominatim — no API key, works on any server) ─────

def geocode_address(query: str, restrict_to_nassau: bool = True) -> list:
    """Search for an address. Returns list of dicts with lat, lon, display_name."""
    try:
        params = {
            "q": query + (", Nassau Bahamas" if restrict_to_nassau and "bahamas" not in query.lower() else ""),
            "format": "json",
            "limit": 6,
            "addressdetails": 1,
        }
        if restrict_to_nassau:
            params["bounded"] = 0
            params["countrycodes"] = "bs"
        resp = requests.get(f"{NOMINATIM_URL}/search", params=params,
                            headers=HEADERS, timeout=6)
        return resp.json()
    except Exception:
        return []


def reverse_geocode(lat: float, lng: float) -> str:
    """Convert coordinates to a human-readable address string."""
    try:
        resp = requests.get(
            f"{NOMINATIM_URL}/reverse",
            params={"lat": lat, "lon": lng, "format": "json", "zoom": 17},
            headers=HEADERS, timeout=6,
        )
        data = resp.json()
        addr = data.get("address", {})
        parts = []
        for key in ("road", "suburb", "city", "county", "state"):
            if addr.get(key):
                parts.append(addr[key])
                if len(parts) >= 3:
                    break
        return ", ".join(parts) if parts else data.get("display_name", f"{lat:.5f}, {lng:.5f}")
    except Exception:
        return f"{lat:.5f}, {lng:.5f}"


def parse_location_input(text: str):
    """
    Parse coordinates or map links pasted by the user.
    Supports:
      - "25.0800, -77.3420"
      - Google Maps: @lat,lng  ?q=lat,lng  /place/.../lat,lng
      - Apple Maps:  ?ll=lat,lng  ?q=lat,lng
      - Waze:        ul?ll=lat%2Clng
      - WhatsApp / iMessage location text
      - maps.app.goo.gl short links (follows redirect)
    Returns (lat, lng) floats or (None, None).
    """
    text = text.strip()

    # ── Short-link redirect (maps.app.goo.gl, goo.gl/maps, etc.) ─────────────
    if re.search(r"goo\.gl|maps\.app\.goo\.gl|bit\.ly|tinyurl", text):
        url = re.search(r"https?://\S+", text)
        if url:
            try:
                resp = requests.head(url.group(), allow_redirects=True, timeout=5,
                                     headers=HEADERS)
                text = resp.url
            except Exception:
                pass

    # ── Raw "lat, lng" or "lat,lng" on its own line ───────────────────────────
    m = re.match(r"^(-?\d{1,3}\.?\d*)[,\s]+(-?\d{1,3}\.?\d*)$", text)
    if m:
        return float(m.group(1)), float(m.group(2))

    # ── Google Maps @lat,lng,zoom ─────────────────────────────────────────────
    m = re.search(r"@(-?\d+\.?\d+),(-?\d+\.?\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(2))

    # ── ?q=lat,lng  or  ?ll=lat,lng  or  ?center=lat,lng ─────────────────────
    m = re.search(r"[?&](?:q|ll|center)=(-?\d+\.?\d+)[,+%]2C?(-?\d+\.?\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(2))

    m = re.search(r"[?&](?:q|ll|center)=(-?\d+\.?\d+),(-?\d+\.?\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(2))

    # ── /place/.../lat,lng ────────────────────────────────────────────────────
    m = re.search(r"place/[^/]*/(-?\d+\.?\d+),(-?\d+\.?\d+)", text)
    if m:
        return float(m.group(1)), float(m.group(2))

    # ── Waze ul?ll=lat%2Clng ─────────────────────────────────────────────────
    m = re.search(r"ll=(-?\d+\.?\d+)(?:%2C|,)(-?\d+\.?\d+)", text, re.IGNORECASE)
    if m:
        return float(m.group(1)), float(m.group(2))

    # ── WhatsApp "Location: https://maps.google.com/?q=..." ──────────────────
    m = re.search(r"Location:\s*https?://\S+", text, re.IGNORECASE)
    if m:
        sub = parse_location_input(m.group().split(":", 1)[1].strip())
        if sub[0]:
            return sub

    # ── Nassau-area fallback: any two decimals near Nassau coords ─────────────
    m = re.search(r"(2[45]\.\d{3,})[^\d-]+(-7[678]\.\d{3,})", text)
    if m:
        return float(m.group(1)), float(m.group(2))

    return None, None


# ── Road Routing (OSRM — free, no key, works on any server) ──────────────────

def get_route(lat1: float, lng1: float, lat2: float, lng2: float):
    """
    Get the actual driving route between two points via OSRM.
    Returns dict with:
      - coords: list of (lat, lng) tuples for the polyline
      - distance_km: road distance in km
      - duration_min: estimated drive time in minutes
    Returns None on failure.
    """
    try:
        url = f"{OSRM_URL}/{lng1},{lat1};{lng2},{lat2}"
        resp = requests.get(url, params={"overview": "full", "geometries": "geojson"},
                            timeout=8)
        data = resp.json()
        if data.get("code") == "Ok":
            route = data["routes"][0]
            coords = [(c[1], c[0]) for c in route["geometry"]["coordinates"]]
            return {
                "coords": coords,
                "distance_km": route["distance"] / 1000,
                "duration_min": route["duration"] / 60,
            }
    except Exception:
        pass
    return None


# ── Drivers ──────────────────────────────────────────────────────────────────

def get_all_drivers():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM drivers ORDER BY id")
            return cur.fetchall()


def get_driver(driver_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM drivers WHERE id = %s", (driver_id,))
            return cur.fetchone()


def find_driver_by_phone(phone: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM drivers WHERE phone = %s", (phone.strip(),))
            return cur.fetchone()


def register_driver(name, phone, email, license_number,
                    vehicle_make, vehicle_model, vehicle_year,
                    vehicle_plate, vehicle_color):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO drivers
                  (name, phone, email, license_number,
                   vehicle_make, vehicle_model, vehicle_year,
                   vehicle_plate, vehicle_color)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (name, phone, email, license_number,
                  vehicle_make, vehicle_model, vehicle_year,
                  vehicle_plate, vehicle_color))
            return cur.fetchone()


def update_driver_status(driver_id: int, status: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE drivers SET status=%s WHERE id=%s RETURNING *",
                (status, driver_id))
            return cur.fetchone()


def update_driver_location(driver_id: int, lat: float, lng: float):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE drivers SET last_lat=%s, last_lng=%s, last_location_updated_at=%s WHERE id=%s",
                (lat, lng, datetime.utcnow(), driver_id))


# ── Rides ─────────────────────────────────────────────────────────────────────

def get_all_rides():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT r.*, d.name as driver_name, d.vehicle_plate as driver_plate
                FROM rides r
                LEFT JOIN drivers d ON r.driver_id = d.id
                ORDER BY r.id DESC
            """)
            return cur.fetchall()


def get_ride(ride_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT r.*, d.name as driver_name, d.vehicle_plate as driver_plate
                FROM rides r
                LEFT JOIN drivers d ON r.driver_id = d.id
                WHERE r.id = %s
            """, (ride_id,))
            return cur.fetchone()


def create_ride(client_name, client_phone,
                pickup_location, pickup_lat, pickup_lng,
                dropoff_location, dropoff_lat, dropoff_lng,
                notes=""):
    km = haversine(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
    fare = calc_fare(km)
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO rides
                  (client_name, client_phone,
                   pickup_location, pickup_lat, pickup_lng,
                   dropoff_location, dropoff_lat, dropoff_lng,
                   distance_km, estimated_fare, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (client_name, client_phone,
                  pickup_location, pickup_lat, pickup_lng,
                  dropoff_location, dropoff_lat, dropoff_lng,
                  round(km, 3), fare, notes))
            return cur.fetchone()


def update_ride_status(ride_id: int, status: str, driver_id: int = None):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            now = datetime.utcnow()
            if status == "accepted":
                cur.execute("""
                    UPDATE rides SET status=%s, driver_id=%s, accepted_at=%s
                    WHERE id=%s RETURNING *
                """, (status, driver_id, now, ride_id))
                ride = cur.fetchone()          # fetch BEFORE second query
                if driver_id:
                    cur.execute("UPDATE drivers SET status='busy' WHERE id=%s", (driver_id,))
                return ride
            elif status == "in_progress":
                cur.execute("""
                    UPDATE rides SET status=%s, started_at=%s WHERE id=%s RETURNING *
                """, (status, now, ride_id))
                return cur.fetchone()
            elif status == "completed":
                cur.execute("""
                    UPDATE rides SET status=%s, completed_at=%s, final_fare=estimated_fare
                    WHERE id=%s RETURNING *
                """, (status, now, ride_id))
                ride = cur.fetchone()
                if ride and ride["driver_id"]:
                    cur.execute("""
                        UPDATE drivers SET status='available', total_rides=total_rides+1
                        WHERE id=%s
                    """, (ride["driver_id"],))
                    cur.execute("""
                        INSERT INTO bills
                          (ride_id, driver_id, client_name, pickup_location, dropoff_location,
                           distance_km, base_fare, distance_fare, total_fare, currency)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'USD')
                    """, (ride["id"], ride["driver_id"], ride["client_name"],
                          ride["pickup_location"], ride["dropoff_location"],
                          ride["distance_km"], BASE_FARE,
                          round(ride["estimated_fare"] - BASE_FARE, 2),
                          ride["estimated_fare"]))
                return ride
            elif status == "cancelled":
                cur.execute("""
                    UPDATE rides SET status=%s WHERE id=%s RETURNING *
                """, (status, ride_id))
                return cur.fetchone()
            return None
