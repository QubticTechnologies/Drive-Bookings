import streamlit as st
import folium
from streamlit_folium import st_folium
from datetime import datetime
import time
import db

st.set_page_config(
    page_title="GoRide",
    page_icon="🚖",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── GoRide brand CSS — Bahamas national colors ─────────────────────────────────
st.markdown("""
<style>
/* Bahamas aquamarine #00C2D4 · gold #FFC72C */
:root {
    --gr-aqua: #00C2D4;
    --gr-gold: #FFC72C;
    --gr-dark: #050d0f;
}
/* Primary buttons → aquamarine */
.stButton > button[kind="primary"],
.stFormSubmitButton > button[kind="primary"] {
    background-color: var(--gr-aqua) !important;
    border-color: var(--gr-aqua) !important;
    color: #050d0f !important;
    font-weight: 700 !important;
}
.stButton > button[kind="primary"]:hover,
.stFormSubmitButton > button[kind="primary"]:hover {
    background-color: #00a8b8 !important;
    border-color: #00a8b8 !important;
}
/* Links & active elements */
a { color: var(--gr-aqua) !important; }
/* Metric delta positive */
[data-testid="stMetricDelta"] { color: var(--gr-aqua); }
/* Divider */
hr { border-color: rgba(0,194,212,0.18) !important; }
</style>
""", unsafe_allow_html=True)

ADMIN_PIN = "1234"
NASSAU_CENTER = [25.0480, -77.3554]

# ── Session state init ────────────────────────────────────────────────────────
for key, default in {
    "mode": None,       # "client" | "driver" | "office"
    "page": "home",
    "driver_id": None,
    "ride_id": None,
    "pin_input": "",
}.items():
    if key not in st.session_state:
        st.session_state[key] = default


def nav(page, **kwargs):
    st.session_state.page = page
    for k, v in kwargs.items():
        st.session_state[k] = v
    st.rerun()


def logout():
    st.session_state.mode = None
    st.session_state.page = "home"
    st.session_state.driver_id = None
    st.session_state.ride_id = None
    st.rerun()


# ── Header ────────────────────────────────────────────────────────────────────
col_logo, col_mode, col_logout = st.columns([3, 6, 1])
with col_logo:
    st.markdown("""
<span style="display:inline-flex;align-items:center;gap:8px;line-height:1;">
  <span style="display:inline-flex;align-items:center;gap:4px;">
    <span style="background:rgba(0,194,212,0.15);border:1.5px solid #00C2D4;border-radius:8px;padding:2px 8px;font-size:22px;font-weight:800;color:#00C2D4;letter-spacing:-1px;">G</span>
    <span style="background:rgba(255,199,44,0.15);border:1.5px solid #FFC72C;border-radius:8px;padding:2px 8px;font-size:22px;font-weight:800;color:#FFC72C;letter-spacing:-1px;">R</span>
  </span>
  <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">GoRide</span>
</span>
<br><span style="font-size:12px;color:#6b9aa2;letter-spacing:0.3px;">Go Further<span style="color:#FFC72C;">.</span></span>
""", unsafe_allow_html=True)
with col_mode:
    if st.session_state.mode == "driver":
        drv = db.get_driver(st.session_state.driver_id)
        st.caption(f"🚗 Driver Mode — {drv['name'] if drv else ''}")
    elif st.session_state.mode == "office":
        st.caption("📡 Main Office")
    elif st.session_state.mode == "client":
        st.caption("👤 Client Mode")
with col_logout:
    if st.session_state.mode:
        if st.button("⬅ Exit", use_container_width=True):
            logout()

st.divider()


# ═══════════════════════════════════════════════════════════════════════════════
# HOME
# ═══════════════════════════════════════════════════════════════════════════════
def page_home():
    st.markdown("""
<h1 style="font-size:2.4rem;font-weight:800;letter-spacing:-1px;margin-bottom:4px;">
  Go Further<span style="color:#FFC72C;">.</span>
</h1>
<p style="font-size:1.05rem;color:#6b9aa2;margin-top:0;">Nassau's premier ride-hailing platform &mdash; <span style="color:#00C2D4;">safe</span>, <span style="color:#FFC72C;">fast</span>, transparent.</p>
""", unsafe_allow_html=True)
    st.write("")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("### 👤 Request a Ride")
        st.write("Book a ride instantly. No account needed — just enter your pickup and drop-off.")
        st.write("")
        if st.button("🚖 Book Now", use_container_width=True, type="primary"):
            st.session_state.mode = "client"
            nav("client_book")

    with col2:
        st.markdown("### 🚗 Driver Login")
        st.write("Already registered? Sign in with your phone number to access your dashboard.")
        st.write("")
        if st.button("🔑 Sign In", use_container_width=True):
            nav("driver_login")
        if st.button("➕ Register as Driver", use_container_width=True):
            nav("driver_register")

    with col3:
        st.markdown("### 📡 Main Office")
        st.write("Admin access only. Dispatch rides and track all drivers live on the map.")
        st.write("")
        if st.button("🔒 Admin Login", use_container_width=True):
            nav("office_login")


# ═══════════════════════════════════════════════════════════════════════════════
# DRIVER REGISTER
# ═══════════════════════════════════════════════════════════════════════════════
def page_driver_register():
    st.markdown("## 🚗 Driver Registration")
    st.write("Fill in your details to join the fleet.")

    with st.form("register_form"):
        st.markdown("**Personal Details**")
        c1, c2 = st.columns(2)
        name = c1.text_input("Full Name", placeholder="James Smith")
        phone = c2.text_input("Phone Number", placeholder="+1 (242) 555-0144")
        c3, c4 = st.columns(2)
        email = c3.text_input("Email", placeholder="james.smith@example.com")
        license_no = c4.text_input("License Number", placeholder="BS242DRV01")

        st.markdown("**Vehicle Details**")
        c5, c6 = st.columns(2)
        make = c5.text_input("Make", placeholder="Toyota")
        model = c6.text_input("Model", placeholder="Camry")
        c7, c8 = st.columns(2)
        year = c7.number_input("Year", min_value=2000, max_value=2030, value=2022, step=1)
        plate = c8.text_input("License Plate", placeholder="NP 4821")
        color = st.text_input("Vehicle Color", placeholder="Pearl White")

        submitted = st.form_submit_button("✅ Register Vehicle", use_container_width=True, type="primary")

    if submitted:
        if not all([name, phone, email, license_no, make, model, plate, color]):
            st.error("Please fill in all fields.")
        else:
            try:
                driver = db.register_driver(
                    name, phone, email, license_no,
                    make, model, int(year), plate, color
                )
                st.session_state.mode = "driver"
                st.session_state.driver_id = driver["id"]
                st.success(f"Welcome to GoRide, {driver['name']}!")
                time.sleep(1)
                nav("driver_dashboard")
            except Exception as e:
                if "23505" in str(e):
                    st.error("A driver with this email, license, or plate already exists.")
                else:
                    st.error(f"Registration failed: {e}")

    st.write("")
    if st.button("← Back to Home"):
        nav("home")


# ═══════════════════════════════════════════════════════════════════════════════
# DRIVER LOGIN
# ═══════════════════════════════════════════════════════════════════════════════
def page_driver_login():
    st.markdown("## 🚗 Driver Login")
    st.write("Enter your registered phone number to access your dashboard.")

    with st.form("login_form"):
        phone = st.text_input("Phone Number", placeholder="+1 (242) 555-0144")
        submitted = st.form_submit_button("Sign In to Dashboard", use_container_width=True, type="primary")

    if submitted:
        if not phone.strip():
            st.error("Please enter your phone number.")
        else:
            driver = db.find_driver_by_phone(phone)
            if driver:
                st.session_state.mode = "driver"
                st.session_state.driver_id = driver["id"]
                st.success(f"Welcome back, {driver['name']}!")
                time.sleep(0.8)
                nav("driver_dashboard")
            else:
                st.error("No driver account found with that phone number.")

    st.write("")
    col1, col2 = st.columns(2)
    if col1.button("➕ Register instead"):
        nav("driver_register")
    if col2.button("← Back to Home"):
        nav("home")


# ═══════════════════════════════════════════════════════════════════════════════
# DRIVER DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
def page_driver_dashboard():
    driver_id = st.session_state.driver_id
    driver = db.get_driver(driver_id)
    if not driver:
        st.error("Session expired.")
        nav("home")
        return

    all_rides = db.get_all_rides()
    pending_rides = [r for r in all_rides if r["status"] == "pending"]
    my_active = [r for r in all_rides if r["driver_id"] == driver_id and r["status"] in ("accepted", "in_progress")]
    current_ride = my_active[0] if my_active else None

    # Profile sidebar
    col_profile, col_main = st.columns([1, 2])

    with col_profile:
        st.markdown(f"### {driver['name']}")
        status_emoji = "🟢" if driver["status"] == "available" else "🟡" if driver["status"] == "busy" else "⚫"
        st.markdown(f"{status_emoji} **{driver['status'].capitalize()}**")
        st.markdown(f"🚗 {driver['vehicle_make']} {driver['vehicle_model']} · {driver['vehicle_plate']}")
        st.markdown(f"⭐ {float(driver['rating']):.1f} rating  ·  {driver['total_rides']} rides")
        st.divider()

        if driver["status"] == "available":
            if st.button("🔴 Go Offline", use_container_width=True):
                db.update_driver_status(driver_id, "offline")
                st.rerun()
        elif driver["status"] == "offline":
            if st.button("🟢 Go Online", use_container_width=True, type="primary"):
                db.update_driver_status(driver_id, "available")
                st.rerun()
        else:
            st.button("🟡 Busy (on a ride)", use_container_width=True, disabled=True)

    with col_main:
        if current_ride:
            st.markdown("### 🚀 Active Ride")
            st.markdown(f"**Status:** `{current_ride['status'].replace('_', ' ').upper()}`")
            st.markdown(f"**Client:** {current_ride['client_name']} · {current_ride['client_phone']}")
            st.markdown(f"**Fare:** {db.fmt_usd(current_ride['estimated_fare'])}  ·  {current_ride['distance_km']:.1f} km")

            c1, c2 = st.columns(2)
            with c1:
                st.markdown("📍 **Pickup**")
                st.info(current_ride["pickup_location"])
            with c2:
                st.markdown("🏁 **Drop-off**")
                st.info(current_ride["dropoff_location"])

            if current_ride["status"] == "accepted":
                if st.button("▶ Start Ride", use_container_width=True, type="primary"):
                    db.update_ride_status(current_ride["id"], "in_progress")
                    st.rerun()
            elif current_ride["status"] == "in_progress":
                if st.button("✅ Complete Ride", use_container_width=True):
                    db.update_ride_status(current_ride["id"], "completed")
                    st.success("Ride completed! Bill generated.")
                    time.sleep(1)
                    st.rerun()

        else:
            st.markdown("### 📋 Ride Requests")
            st.caption(f"{len(pending_rides)} pending")

            if driver["status"] != "available":
                st.warning("You are offline. Go online to receive ride requests.")
            elif not pending_rides:
                st.info("⏳ Searching for riders... Requests will appear here.")
            else:
                for ride in pending_rides:
                    with st.container(border=True):
                        c1, c2 = st.columns([3, 1])
                        with c1:
                            st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}**  ·  {ride['distance_km']:.1f} km  ·  {ride['client_name']}")
                            st.caption(f"📍 {ride['pickup_location']}")
                            st.caption(f"🏁 {ride['dropoff_location']}")
                        with c2:
                            created = ride["created_at"]
                            if isinstance(created, datetime):
                                st.caption(created.strftime("%H:%M"))
                            if st.button("Accept", key=f"accept_{ride['id']}", type="primary"):
                                db.update_ride_status(ride["id"], "accepted", driver_id)
                                st.rerun()

    # Auto-refresh every 5s while online
    if driver["status"] == "available":
        time.sleep(5)
        st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# CLIENT – BOOK RIDE
# ═══════════════════════════════════════════════════════════════════════════════
NASSAU_PLACES = {
    "✈️  Airport & Port": [
        ("Lynden Pindling Int'l Airport",            25.0389, -77.4659, "Main international airport"),
        ("Nassau Cruise Port (Prince George Wharf)",  25.0811, -77.3513, "All cruise ships dock here"),
    ],
    "🏨  Hotels & Resorts": [
        ("Atlantis Paradise Island",                  25.0872, -77.3149, "Iconic resort on Paradise Island"),
        ("Baha Mar Resort (Cable Beach)",             25.0738, -77.4025, "Luxury resort complex"),
        ("Sandals Royal Bahamian",                    25.0700, -77.3870, "Adults-only Cable Beach resort"),
        ("British Colonial Hilton",                   25.0800, -77.3420, "Historic hotel, downtown"),
        ("Comfort Suites Paradise Island",            25.0870, -77.3200, "Budget-friendly Paradise Island"),
        ("Melia Nassau Beach Resort",                 25.0690, -77.3950, "Cable Beach"),
    ],
    "🏖️  Beaches": [
        ("Cable Beach",                               25.0700, -77.3900, "Most popular tourist beach"),
        ("Junkanoo Beach",                            25.0780, -77.3480, "Free beach near cruise port"),
        ("Montagu Beach",                             25.0580, -77.3000, "Quiet local beach, east Nassau"),
        ("Love Beach",                                25.0760, -77.4700, "Snorkelling spot, west Nassau"),
        ("Goodman's Bay",                             25.0770, -77.3850, "Park & picnic beach"),
    ],
    "🏛️  Downtown Nassau": [
        ("Parliament Square",                         25.0770, -77.3410, "City centre landmark"),
        ("Straw Market (Bay Street)",                 25.0787, -77.3440, "Souvenirs & local crafts"),
        ("Arawak Cay — Fish Fry",                    25.0800, -77.3600, "Best local seafood strip"),
        ("Fort Charlotte",                            25.0790, -77.3650, "Historic fort & gardens"),
        ("Nassau Harbour Club & Marina",              25.0820, -77.3300, "East bay waterfront"),
    ],
    "🏘️  Residential Areas": [
        ("Sandyport",                                 25.0750, -77.4120, "Western gated community"),
        ("Carmichael Road",                           25.0350, -77.4000, "South New Providence"),
        ("Soldier Road",                              25.0500, -77.3400, "Eastern corridor"),
        ("Village Road",                              25.0450, -77.3150, "Eastern suburbs"),
        ("Lyford Cay",                                25.0300, -77.5300, "Exclusive western enclave"),
    ],
}

QUICK_ROUTES = [
    ("✈️ → 🏛️  Airport → Downtown",   "Lynden Pindling Int'l Airport",            "Parliament Square"),
    ("🚢 → 🏨  Port → Atlantis",        "Nassau Cruise Port (Prince George Wharf)",  "Atlantis Paradise Island"),
    ("✈️ → 🏨  Airport → Baha Mar",     "Lynden Pindling Int'l Airport",            "Baha Mar Resort (Cable Beach)"),
    ("🚢 → 🏖️  Port → Cable Beach",    "Nassau Cruise Port (Prince George Wharf)",  "Cable Beach"),
    ("🏖️ → 🍤  Beach → Fish Fry",      "Cable Beach",                               "Arawak Cay — Fish Fry"),
]

def _get_place_coords(name):
    for places in NASSAU_PLACES.values():
        for p in places:
            if p[0] == name:
                return p[1], p[2]
    return 25.048, -77.355

def _all_place_names():
    names = []
    for cat, places in NASSAU_PLACES.items():
        names.append(f"── {cat} ──")
        for p in places:
            names.append(p[0])
    return names


def page_client_book():
    st.markdown("## 🚖 Where are you headed?")
    st.markdown("Safe, reliable rides across Nassau — for **visitors & locals** alike. **Fares in USD.**")

    # Quick routes
    st.markdown("**Popular Routes — click to auto-fill:**")
    route_cols = st.columns(len(QUICK_ROUTES))
    for i, (label, pickup, dropoff) in enumerate(QUICK_ROUTES):
        with route_cols[i]:
            if st.button(label, use_container_width=True, key=f"qr_{i}"):
                st.session_state._quick_pickup = pickup
                st.session_state._quick_dropoff = dropoff
                st.rerun()

    # Pre-fill from quick route
    default_pickup = st.session_state.get("_quick_pickup", "Lynden Pindling Int'l Airport")
    default_dropoff = st.session_state.get("_quick_dropoff", "Parliament Square")

    all_names = _all_place_names()
    pickup_names = [n for n in all_names if not n.startswith("──")]
    dropoff_names = pickup_names.copy()

    st.divider()
    info_col, form_col = st.columns([1, 2])

    with info_col:
        st.markdown("#### 🌴 Welcome to Nassau")
        st.markdown("""
**Before you ride:**
- 💵 All fares in US Dollars (USD)  
- 📱 Driver will call/text when nearby  
- 🏷️ Fare confirmed at drop-off  
- 🧾 Invoice generated automatically  
- 🔒 Licensed & insured drivers  
- ⏱️ Avg wait: 5–10 minutes  

**First time here?**  
- Airport → Cable Beach: ~25 min  
- Airport → Atlantis: ~30 min  
- Cruise Port → Straw Market: walking distance  

**Currency:** BSD = USD (1:1). USD accepted everywhere.  
**Tipping:** Not required, but appreciated.
        """)

    with form_col:
        with st.form("book_form"):
            st.markdown("**Your Details**")
            c1, c2 = st.columns(2)
            client_name = c1.text_input("Your Name", placeholder="Sarah Brown")
            client_phone = c2.text_input("Phone Number", placeholder="+1 (242) 555-0199",
                                         help="Include country code if international, e.g. +44, +1")

            st.markdown("**Your Trip**")
            c3, c4 = st.columns(2)

            pickup_idx = pickup_names.index(default_pickup) if default_pickup in pickup_names else 0
            dropoff_idx = dropoff_names.index(default_dropoff) if default_dropoff in dropoff_names else 5

            pickup_name  = c3.selectbox("📍 Pickup Location",  pickup_names,  index=pickup_idx)
            dropoff_name = c4.selectbox("🏁 Drop-off Location", dropoff_names, index=dropoff_idx)

            st.markdown("**Notes for your driver** *(optional)*")
            col_notes, col_quick = st.columns([2, 1])
            notes = col_notes.text_area("", placeholder="E.g. I'm at the south entrance with luggage…", height=90, label_visibility="collapsed")
            with col_quick:
                st.caption("Quick notes:")
                quick_notes = []
                if st.checkbox("🧳 Have luggage"):     quick_notes.append("I have luggage 🧳")
                if st.checkbox("👶 Baby seat needed"): quick_notes.append("Baby seat needed 👶")
                if st.checkbox("♿ Wheelchair access"): quick_notes.append("Wheelchair access needed ♿")
                if st.checkbox("🚪 At main entrance"): quick_notes.append("I'll be at the main entrance 🚪")
            all_notes = "\n".join(filter(None, [notes] + quick_notes))

            # Live fare preview inside form
            p_lat, p_lng = _get_place_coords(pickup_name)
            d_lat, d_lng = _get_place_coords(dropoff_name)
            dist = db.haversine(p_lat, p_lng, d_lat, d_lng)
            fare = db.calc_fare(dist)
            fare_col1, fare_col2 = st.columns([1, 1])
            fare_col1.metric("Estimated Fare", db.fmt_usd(fare))
            fare_col2.metric("Distance", f"{dist:.1f} km")
            st.caption(f"$3.00 base + ${fare - 3:.2f} distance · Final fare confirmed at drop-off")

            submitted = st.form_submit_button("🚖 Request Ride Now", use_container_width=True, type="primary")

        if submitted:
            if not client_name or not client_phone:
                st.error("Please enter your name and phone number.")
            elif pickup_name == dropoff_name:
                st.error("Pickup and drop-off must be different locations.")
            else:
                ride = db.create_ride(
                    client_name, client_phone,
                    pickup_name, p_lat, p_lng,
                    dropoff_name, d_lat, d_lng,
                    all_notes,
                )
                st.session_state.ride_id = ride["id"]
                st.session_state._quick_pickup = None
                st.session_state._quick_dropoff = None
                st.success(f"Ride requested! Estimate: {db.fmt_usd(ride['estimated_fare'])} · {ride['distance_km']:.1f} km")
                time.sleep(1)
                nav("client_track")

    if st.button("← Back to Home"):
        nav("home")


# ═══════════════════════════════════════════════════════════════════════════════
# CLIENT – TRACK RIDE
# ═══════════════════════════════════════════════════════════════════════════════
def page_client_track():
    ride_id = st.session_state.ride_id
    if not ride_id:
        st.warning("No active ride.")
        nav("client_book")
        return

    ride = db.get_ride(ride_id)
    if not ride:
        st.error("Ride not found.")
        nav("client_book")
        return

    st.markdown(f"## 📍 Ride #{ride['id']} — Status")

    STATUS_MAP = {
        "pending": ("⏳", "Pending", "Waiting for a driver..."),
        "accepted": ("🚗", "Driver Assigned", "Your driver is on the way!"),
        "in_progress": ("🚀", "In Progress", "You're on your way!"),
        "completed": ("✅", "Completed", "You've arrived. Enjoy your day!"),
        "cancelled": ("❌", "Cancelled", "This ride was cancelled."),
    }
    icon, label, msg = STATUS_MAP.get(ride["status"], ("❓", ride["status"], ""))

    col1, col2 = st.columns([1, 2])
    with col1:
        st.metric("Status", f"{icon} {label}")
        st.metric("Estimated Fare", db.fmt_usd(ride["estimated_fare"]))
        st.metric("Distance", f"{ride['distance_km']:.1f} km")
        if ride["driver_name"]:
            st.markdown(f"🚗 **Driver:** {ride['driver_name']}")
            st.markdown(f"🔖 **Plate:** {ride['driver_plate']}")

    with col2:
        st.info(msg)
        c1, c2 = st.columns(2)
        c1.markdown(f"**📍 Pickup**  \n{ride['pickup_location']}")
        c2.markdown(f"**🏁 Drop-off**  \n{ride['dropoff_location']}")

        # Mini map
        m = folium.Map(
            location=[ride["pickup_lat"], ride["pickup_lng"]],
            zoom_start=13,
            tiles="CartoDB dark_matter",
        )
        folium.Marker(
            [ride["pickup_lat"], ride["pickup_lng"]],
            tooltip="Pickup",
            icon=folium.Icon(color="blue", icon="play"),
        ).add_to(m)
        folium.Marker(
            [ride["dropoff_lat"], ride["dropoff_lng"]],
            tooltip="Drop-off",
            icon=folium.Icon(color="green", icon="flag"),
        ).add_to(m)
        st_folium(m, height=250, use_container_width=True)

    if ride["status"] in ("completed", "cancelled"):
        if st.button("Book Another Ride", type="primary"):
            st.session_state.ride_id = None
            nav("client_book")
    else:
        if st.button("🔄 Refresh Status", use_container_width=True):
            st.rerun()
        st.caption("Page auto-refreshes every 8 seconds while ride is active.")
        time.sleep(8)
        st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# OFFICE LOGIN
# ═══════════════════════════════════════════════════════════════════════════════
def page_office_login():
    st.markdown("## 🔒 Admin Access")
    st.write("Enter the 4-digit PIN to access the Main Office dispatch dashboard.")

    with st.form("pin_form"):
        pin = st.text_input("PIN", type="password", max_chars=4, placeholder="••••")
        submitted = st.form_submit_button("🔓 Unlock Dashboard", use_container_width=True, type="primary")

    if submitted:
        if pin == ADMIN_PIN:
            st.session_state.mode = "office"
            st.success("Access granted. Welcome to Main Office.")
            time.sleep(0.8)
            nav("office_dashboard")
        else:
            st.error("Incorrect PIN. Please try again.")

    if st.button("← Back to Home"):
        nav("home")


# ═══════════════════════════════════════════════════════════════════════════════
# OFFICE DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
def page_office_dashboard():
    if st.session_state.mode != "office":
        st.error("Access denied.")
        nav("office_login")
        return

    st.markdown("## 📡 Main Office — Dispatch Dashboard")

    drivers = db.get_all_drivers()
    all_rides = db.get_all_rides()
    pending = [r for r in all_rides if r["status"] == "pending"]
    active = [r for r in all_rides if r["status"] in ("accepted", "in_progress")]
    available_drivers = [d for d in drivers if d["status"] == "available"]

    # Stats
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Drivers", len(drivers))
    c2.metric("Available", len(available_drivers))
    c3.metric("Pending Rides", len(pending))
    c4.metric("Active Rides", len(active))

    st.divider()

    map_col, panel_col = st.columns([3, 2])

    # ── Live Map ──────────────────────────────────────────────────────────────
    with map_col:
        st.markdown("#### 🗺 Live Driver Map")

        m = folium.Map(
            location=NASSAU_CENTER,
            zoom_start=13,
            tiles="CartoDB dark_matter",
        )

        COLOR_MAP = {"available": "green", "busy": "orange", "offline": "gray"}
        STATUS_EMOJI = {"available": "🟢", "busy": "🟡", "offline": "⚫"}

        for d in drivers:
            lat = float(d["last_lat"]) if d["last_lat"] else (25.048 + (d["id"] * 0.003) % 0.12 - 0.06)
            lng = float(d["last_lng"]) if d["last_lng"] else (-77.355 + (d["id"] * 0.007) % 0.20 - 0.10)
            color = COLOR_MAP.get(d["status"], "gray")

            updated = ""
            if d["last_location_updated_at"]:
                updated = f"<br><small>Updated: {d['last_location_updated_at'].strftime('%H:%M:%S')}</small>"

            popup_html = f"""
            <b>{d['name']}</b><br>
            {d['vehicle_plate']} · {d['vehicle_color']} {d['vehicle_make']}<br>
            <b>{STATUS_EMOJI.get(d['status'], '')} {d['status'].capitalize()}</b>
            {updated}
            """
            folium.CircleMarker(
                location=[lat, lng],
                radius=10 if d["status"] == "available" else 8,
                color="#000",
                weight=2,
                fill=True,
                fill_color={"available": "#10b981", "busy": "#f59e0b", "offline": "#6b7280"}.get(d["status"], "#6b7280"),
                fill_opacity=1.0,
                tooltip=folium.Tooltip(popup_html, sticky=True),
            ).add_to(m)

        st_folium(m, height=440, use_container_width=True)

        # Fleet list
        st.markdown("#### 🚗 Fleet")
        if not drivers:
            st.caption("No drivers registered yet.")
        else:
            for d in drivers:
                e = STATUS_EMOJI.get(d["status"], "⚫")
                st.markdown(
                    f"{e} **{d['name']}** — {d['vehicle_plate']} · {d['vehicle_make']} {d['vehicle_model']} "
                    f"· ⭐ {float(d['rating']):.1f} · {d['total_rides']} rides"
                )

    # ── Bookings Panel ────────────────────────────────────────────────────────
    with panel_col:
        st.markdown("#### ⏳ Pending Bookings")

        if not pending:
            st.success("No pending bookings right now.")
        else:
            for ride in pending:
                with st.container(border=True):
                    created = ride["created_at"]
                    time_str = created.strftime("%H:%M") if isinstance(created, datetime) else ""
                    st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}** · {ride['distance_km']:.1f} km · {time_str}")
                    st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                    st.caption(f"📍 {ride['pickup_location']}")
                    st.caption(f"🏁 {ride['dropoff_location']}")

                    if available_drivers:
                        driver_options = {f"{d['name']} — {d['vehicle_plate']}": d["id"] for d in available_drivers}
                        chosen_label = st.selectbox(
                            "Assign driver",
                            list(driver_options.keys()),
                            key=f"sel_{ride['id']}",
                        )
                        if st.button(f"Dispatch →", key=f"dispatch_{ride['id']}", type="primary", use_container_width=True):
                            chosen_id = driver_options[chosen_label]
                            db.update_ride_status(ride["id"], "accepted", chosen_id)
                            st.success(f"Dispatched to {chosen_label.split(' — ')[0]}!")
                            st.rerun()
                    else:
                        st.warning("No available drivers right now.")

        st.markdown("#### 🚀 Active Rides")
        if not active:
            st.caption("No active rides.")
        else:
            for ride in active:
                with st.container(border=True):
                    badge = "🚀 IN PROGRESS" if ride["status"] == "in_progress" else "🚗 ACCEPTED"
                    st.markdown(f"{badge} · {db.fmt_usd(ride['estimated_fare'])}")
                    st.caption(f"👤 {ride['client_name']}")
                    st.caption(f"📍 {ride['pickup_location']} → {ride['dropoff_location']}")
                    if ride["driver_name"]:
                        st.caption(f"🚗 {ride['driver_name']} · {ride['driver_plate']}")

    # Auto-refresh every 6s
    time.sleep(6)
    st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════════
page = st.session_state.page

if page == "home":
    page_home()
elif page == "driver_register":
    page_driver_register()
elif page == "driver_login":
    page_driver_login()
elif page == "driver_dashboard":
    if st.session_state.mode == "driver" and st.session_state.driver_id:
        page_driver_dashboard()
    else:
        nav("driver_login")
elif page == "client_book":
    page_client_book()
elif page == "client_track":
    page_client_track()
elif page == "office_login":
    page_office_login()
elif page == "office_dashboard":
    if st.session_state.mode == "office":
        page_office_dashboard()
    else:
        nav("office_login")
else:
    nav("home")
