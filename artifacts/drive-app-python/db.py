import os
import math
import psycopg2
import psycopg2.extras
from datetime import datetime

BASE_FARE = 3.0
PER_KM = 1.50


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
                if driver_id:
                    cur.execute("UPDATE drivers SET status='busy' WHERE id=%s", (driver_id,))
            elif status == "in_progress":
                cur.execute("""
                    UPDATE rides SET status=%s, started_at=%s WHERE id=%s RETURNING *
                """, (status, now, ride_id))
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
