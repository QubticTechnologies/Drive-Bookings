import streamlit as st
import folium
from streamlit_folium import st_folium
from datetime import datetime
import time
import db

st.set_page_config(
    page_title="DriveApp",
    page_icon="🚖",
    layout="wide",
    initial_sidebar_state="collapsed",
)

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
    st.markdown("## 🚖 DriveApp")
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
    st.markdown("# Move **Smarter.**")
    st.markdown("##### Nassau's premium ride-hailing platform. Fast, safe, transparent.")
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
                st.success(f"Welcome to DriveApp, {driver['name']}!")
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
def page_client_book():
    st.markdown("## 🚖 Request a Ride")
    st.write("Enter your details and Nassau pickup/drop-off locations.")

    NASSAU_LOCATIONS = {
        "Lynden Pindling Int'l Airport": (25.0389, -77.4659),
        "Cable Beach": (25.0700, -77.3900),
        "Atlantis Paradise Island": (25.0872, -77.3149),
        "Nassau Cruise Port": (25.0811, -77.3513),
        "Baha Mar Resort": (25.0738, -77.4025),
        "Downtown Nassau (Parliament Sq)": (25.0770, -77.3407),
        "Montagu Beach": (25.0600, -77.3000),
        "Prince Charles Drive": (25.0480, -77.3554),
        "Shirley Street": (25.0780, -77.3380),
        "Custom Address": None,
    }

    with st.form("book_form"):
        st.markdown("**Your Details**")
        c1, c2 = st.columns(2)
        client_name = c1.text_input("Your Name", placeholder="Sarah Brown")
        client_phone = c2.text_input("Phone Number", placeholder="+1 (242) 555-0199")

        st.markdown("**Trip Details**")
        c3, c4 = st.columns(2)
        pickup_label = c3.selectbox("Pickup Location", list(NASSAU_LOCATIONS.keys()), index=0)
        dropoff_label = c4.selectbox("Drop-off Location", list(NASSAU_LOCATIONS.keys()), index=5)

        custom_pickup = custom_dropoff = ""
        custom_pickup_lat = custom_pickup_lng = 25.048
        custom_dropoff_lat = custom_dropoff_lng = 25.077
        if pickup_label == "Custom Address":
            custom_pickup = st.text_input("Pickup address")
        if dropoff_label == "Custom Address":
            custom_dropoff = st.text_input("Drop-off address")

        notes = st.text_area("Notes (optional)", placeholder="e.g. I have luggage", height=80)
        submitted = st.form_submit_button("🚖 Request Ride", use_container_width=True, type="primary")

    if submitted:
        if not client_name or not client_phone:
            st.error("Please enter your name and phone number.")
        elif pickup_label == dropoff_label:
            st.error("Pickup and drop-off must be different.")
        else:
            p_name = custom_pickup if pickup_label == "Custom Address" else pickup_label
            d_name = custom_dropoff if dropoff_label == "Custom Address" else dropoff_label
            p_coords = (custom_pickup_lat, custom_pickup_lng) if pickup_label == "Custom Address" else NASSAU_LOCATIONS[pickup_label]
            d_coords = (custom_dropoff_lat, custom_dropoff_lng) if dropoff_label == "Custom Address" else NASSAU_LOCATIONS[dropoff_label]

            ride = db.create_ride(
                client_name, client_phone,
                p_name, p_coords[0], p_coords[1],
                d_name, d_coords[0], d_coords[1],
                notes,
            )
            st.session_state.ride_id = ride["id"]
            st.success(f"Ride requested! Fare estimate: {db.fmt_usd(ride['estimated_fare'])} ({ride['distance_km']:.1f} km)")
            time.sleep(1)
            nav("client_track")

    # Fare calculator preview
    st.divider()
    st.markdown("#### 💡 Fare Estimator")
    st.caption(f"Base fare: $3.00 + $1.50/km")

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
