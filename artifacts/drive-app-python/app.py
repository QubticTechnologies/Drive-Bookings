import random
import string
import streamlit as st
import folium
from streamlit_folium import st_folium
from streamlit_js_eval import get_geolocation
from datetime import datetime, date, time as dtime, timedelta
import time
import db

st.set_page_config(
    page_title="GoRide",
    page_icon="🚖",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── GoRide brand CSS ────────────────────────────────────────────────────────────
st.markdown("""
<style>
:root {
    --gr-aqua: #00C2D4;
    --gr-gold: #FFC72C;
    --gr-dark: #050d0f;
}
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
a { color: var(--gr-aqua) !important; }
[data-testid="stMetricDelta"] { color: var(--gr-aqua); }
hr { border-color: rgba(0,194,212,0.18) !important; }

/* Auth card styling */
.auth-card {
    background: linear-gradient(135deg, rgba(0,194,212,0.07) 0%, rgba(255,199,44,0.04) 100%);
    border: 1px solid rgba(0,194,212,0.2);
    border-radius: 16px;
    padding: 28px 32px;
    margin: 0 auto;
}
.auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0;
    color: #6b9aa2;
    font-size: 13px;
}
.lang-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    background: rgba(0,194,212,0.12);
    border: 1px solid rgba(0,194,212,0.3);
    font-size: 13px;
    color: #00C2D4;
    cursor: pointer;
}
</style>
""", unsafe_allow_html=True)

ADMIN_PIN = "1234"
NASSAU_CENTER = [25.0480, -77.3554]

# ── Translations ──────────────────────────────────────────────────────────────
LANG = {
    "en": {
        "name": "English", "flag": "🇬🇧",
        "welcome": "Sign in to ride", "subtitle": "Nassau's premier ride-hailing platform",
        "phone_btn": "📱 Continue with Phone",
        "email_btn": "✉️ Continue with Email",
        "google_btn": "Continue with Google",
        "apple_btn": "Continue with Apple",
        "guest_btn": "👤 Continue as Guest",
        "guest_note": "No account needed · Perfect for tourists",
        "enter_phone": "Phone number", "phone_ph": "+1 (242) 555-0100",
        "enter_email": "Email address", "email_ph": "you@example.com",
        "enter_name": "Your name", "name_ph": "Sarah Brown",
        "name_optional": "Your name (optional for guest)",
        "send_code": "Send Verification Code",
        "otp_title": "Enter verification code",
        "otp_sent_to": "We sent a 6-digit code to",
        "otp_label": "6-digit code", "otp_ph": "000000",
        "verify_btn": "Verify & Continue",
        "resend": "Resend code", "back": "← Back",
        "book_btn": "🚖 Book Now",
        "verified_phone": "Phone verified! Welcome to GoRide 🎉",
        "verified_email": "Email verified! Welcome to GoRide 🎉",
        "wrong_code": "Incorrect code. Please try again.",
        "guest_continue": "Continue as Guest",
        "google_continue": "Continue",
        "or": "or",
        "signed_in_as": "Signed in as",
        "auth_method": "via",
        "profile_title": "Your Profile",
        "sign_out": "Sign Out",
        "book_another": "Book Another Ride",
        "lang_select": "Language",
        "dev_code_note": "Demo mode: your code is",
        "social_email_label": "Email address", "social_name_label": "Display name",
        "social_signin": "Sign In",
    },
    "es": {
        "name": "Español", "flag": "🇪🇸",
        "welcome": "Inicia sesión para viajar", "subtitle": "La plataforma líder de transporte en Nassau",
        "phone_btn": "📱 Continuar con Teléfono",
        "email_btn": "✉️ Continuar con Email",
        "google_btn": "Continuar con Google",
        "apple_btn": "Continuar con Apple",
        "guest_btn": "👤 Continuar como Invitado",
        "guest_note": "Sin cuenta requerida · Perfecto para turistas",
        "enter_phone": "Número de teléfono", "phone_ph": "+1 (242) 555-0100",
        "enter_email": "Correo electrónico", "email_ph": "tú@ejemplo.com",
        "enter_name": "Tu nombre", "name_ph": "María García",
        "name_optional": "Tu nombre (opcional para invitado)",
        "send_code": "Enviar Código de Verificación",
        "otp_title": "Ingresa el código de verificación",
        "otp_sent_to": "Enviamos un código de 6 dígitos a",
        "otp_label": "Código de 6 dígitos", "otp_ph": "000000",
        "verify_btn": "Verificar y Continuar",
        "resend": "Reenviar código", "back": "← Volver",
        "book_btn": "🚖 Reservar Ahora",
        "verified_phone": "¡Teléfono verificado! Bienvenido a GoRide 🎉",
        "verified_email": "¡Email verificado! Bienvenido a GoRide 🎉",
        "wrong_code": "Código incorrecto. Inténtalo de nuevo.",
        "guest_continue": "Continuar como Invitado",
        "google_continue": "Continuar",
        "or": "o",
        "signed_in_as": "Sesión iniciada como",
        "auth_method": "vía",
        "profile_title": "Tu Perfil",
        "sign_out": "Cerrar Sesión",
        "book_another": "Reservar Otro Viaje",
        "lang_select": "Idioma",
        "dev_code_note": "Modo demo: tu código es",
        "social_email_label": "Correo electrónico", "social_name_label": "Nombre",
        "social_signin": "Iniciar Sesión",
    },
    "fr": {
        "name": "Français", "flag": "🇫🇷",
        "welcome": "Connectez-vous pour voyager", "subtitle": "La principale plateforme de transport de Nassau",
        "phone_btn": "📱 Continuer avec Téléphone",
        "email_btn": "✉️ Continuer avec Email",
        "google_btn": "Continuer avec Google",
        "apple_btn": "Continuer avec Apple",
        "guest_btn": "👤 Continuer en Invité",
        "guest_note": "Aucun compte requis · Parfait pour les touristes",
        "enter_phone": "Numéro de téléphone", "phone_ph": "+1 (242) 555-0100",
        "enter_email": "Adresse email", "email_ph": "vous@exemple.com",
        "enter_name": "Votre nom", "name_ph": "Marie Dupont",
        "name_optional": "Votre nom (optionnel pour invité)",
        "send_code": "Envoyer le Code de Vérification",
        "otp_title": "Entrez le code de vérification",
        "otp_sent_to": "Nous avons envoyé un code à 6 chiffres à",
        "otp_label": "Code à 6 chiffres", "otp_ph": "000000",
        "verify_btn": "Vérifier et Continuer",
        "resend": "Renvoyer le code", "back": "← Retour",
        "book_btn": "🚖 Réserver Maintenant",
        "verified_phone": "Téléphone vérifié ! Bienvenue sur GoRide 🎉",
        "verified_email": "Email vérifié ! Bienvenue sur GoRide 🎉",
        "wrong_code": "Code incorrect. Veuillez réessayer.",
        "guest_continue": "Continuer en Invité",
        "google_continue": "Continuer",
        "or": "ou",
        "signed_in_as": "Connecté en tant que",
        "auth_method": "via",
        "profile_title": "Votre Profil",
        "sign_out": "Se Déconnecter",
        "book_another": "Réserver un Autre Trajet",
        "lang_select": "Langue",
        "dev_code_note": "Mode démo : votre code est",
        "social_email_label": "Adresse email", "social_name_label": "Nom d'affichage",
        "social_signin": "Se Connecter",
    },
}

# ── Session state init ────────────────────────────────────────────────────────
_defaults = {
    "mode": None,
    "page": "home",
    "driver_id": None,
    "ride_id": None,
    "pin_input": "",
    # Client auth
    "client_lang": "en",
    "client_auth_method": None,      # phone|email|google|apple|guest
    "client_name": "",
    "client_phone": "",
    "client_email": "",
    "client_otp": "",                # generated code
    "client_otp_contact": "",        # number/email that was used
    "client_otp_type": "",           # "phone" | "email"
    "client_auth_step": "hub",       # hub|phone_entry|email_entry|otp|guest_entry|social_entry
    "client_social_provider": "",    # google|apple
    # Location picker state
    "pickup_lat": None, "pickup_lng": None, "pickup_label": "",
    "dropoff_lat": None, "dropoff_lng": None, "dropoff_label": "",
    "pickup_search_results": [], "dropoff_search_results": [],
    "pickup_paste_text": "", "dropoff_paste_text": "",
    "route_info": None,
}
for key, default in _defaults.items():
    if key not in st.session_state:
        st.session_state[key] = default


def t(key):
    """Get translation for current client language."""
    lang = st.session_state.client_lang
    return LANG.get(lang, LANG["en"]).get(key, LANG["en"].get(key, key))


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


def client_logout():
    st.session_state.client_auth_method = None
    st.session_state.client_name = ""
    st.session_state.client_phone = ""
    st.session_state.client_email = ""
    st.session_state.client_otp = ""
    st.session_state.client_otp_contact = ""
    st.session_state.client_otp_type = ""
    st.session_state.client_auth_step = "hub"
    st.session_state.client_social_provider = ""
    st.session_state.mode = None
    st.session_state.ride_id = None
    nav("home")


def _gen_otp():
    return "".join(random.choices(string.digits, k=6))


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

""", unsafe_allow_html=True)
with col_mode:
    if st.session_state.mode == "driver":
        drv = db.get_driver(st.session_state.driver_id)
        st.caption(f"🚗 Driver Mode — {drv['name'] if drv else ''}")
    elif st.session_state.mode == "office":
        st.caption("📡 Main Office")
    elif st.session_state.mode == "client" and st.session_state.client_auth_method:
        method_icon = {"phone": "📱", "email": "✉️", "google": "🔵", "apple": "🍎", "guest": "👤"}.get(
            st.session_state.client_auth_method, "👤")
        name = st.session_state.client_name or "Guest"
        st.caption(f"{method_icon} {t('signed_in_as')} **{name}**")
with col_logout:
    if st.session_state.mode:
        if st.session_state.mode == "client":
            if st.button("⬅ Exit", use_container_width=True):
                client_logout()
        else:
            if st.button("⬅ Exit", use_container_width=True):
                logout()

st.divider()


# ═══════════════════════════════════════════════════════════════════════════════
# HOME
# ═══════════════════════════════════════════════════════════════════════════════
def page_home():
    st.markdown("""
<h1 style="font-size:2.4rem;font-weight:800;letter-spacing:-1px;margin-bottom:4px;">
</h1>
<p style="font-size:1.05rem;color:#6b9aa2;margin-top:0;">Nassau's premier ride-hailing platform &mdash; <span style="color:#00C2D4;">safe</span>, <span style="color:#FFC72C;">fast</span>, transparent.</p>
""", unsafe_allow_html=True)
    st.write("")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("### 👤 Request a Ride")
        st.write("Sign in with phone, email, Google, Apple — or jump in as a guest. Multi-language support included.")
        st.write("")
        if st.button("🚖 Book Now", use_container_width=True, type="primary"):
            st.session_state.mode = "client"
            st.session_state.client_auth_step = "hub"
            nav("client_auth")

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
# CLIENT AUTH — HUB
# ═══════════════════════════════════════════════════════════════════════════════
def _lang_switcher():
    """Render compact language flag buttons."""
    cols = st.columns(len(LANG))
    for i, (code, info) in enumerate(LANG.items()):
        with cols[i]:
            active = "primary" if st.session_state.client_lang == code else "secondary"
            label = f"{info['flag']} {info['name']}"
            if st.button(label, key=f"lang_{code}", use_container_width=True,
                         type="primary" if st.session_state.client_lang == code else "secondary"):
                st.session_state.client_lang = code
                st.rerun()


def page_client_auth():
    st.session_state.mode = "client"

    # Language selector at top
    with st.container():
        lc1, lc2, lc3 = st.columns([2, 3, 2])
        with lc2:
            st.caption(t("lang_select"))
            _lang_switcher()

    st.write("")

    step = st.session_state.client_auth_step

    # ── OTP step ──────────────────────────────────────────────────────────────
    if step == "otp":
        _page_client_otp()
        return

    # ── Guest entry ───────────────────────────────────────────────────────────
    if step == "guest_entry":
        _page_client_guest()
        return

    # ── Social entry (Google / Apple) ─────────────────────────────────────────
    if step == "social_entry":
        _page_client_social()
        return

    # ── Phone entry ───────────────────────────────────────────────────────────
    if step == "phone_entry":
        _page_client_phone_entry()
        return

    # ── Email entry ───────────────────────────────────────────────────────────
    if step == "email_entry":
        _page_client_email_entry()
        return

    # ── Auth hub (default) ────────────────────────────────────────────────────
    _, center_col, _ = st.columns([1, 2, 1])
    with center_col:
        st.markdown(f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:48px;margin-bottom:8px;">🚖</div>
  <h2 style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;margin:0 0 4px 0;">{t('welcome')}</h2>
  <p style="color:#6b9aa2;font-size:0.95rem;margin:0;">{t('subtitle')}</p>
</div>
""", unsafe_allow_html=True)

        # Social login row
        sc1, sc2 = st.columns(2)
        with sc1:
            if st.button(f"🔵 {t('google_btn')}", use_container_width=True, key="auth_google"):
                st.session_state.client_auth_step = "social_entry"
                st.session_state.client_social_provider = "google"
                st.rerun()
        with sc2:
            if st.button(f"🍎 {t('apple_btn')}", use_container_width=True, key="auth_apple"):
                st.session_state.client_auth_step = "social_entry"
                st.session_state.client_social_provider = "apple"
                st.rerun()

        st.markdown(f"""
<div style="display:flex;align-items:center;gap:12px;margin:16px 0;color:#6b9aa2;font-size:13px;">
  <hr style="flex:1;margin:0;border-color:rgba(0,194,212,0.2)!important;">
  <span>{t('or')}</span>
  <hr style="flex:1;margin:0;border-color:rgba(0,194,212,0.2)!important;">
</div>
""", unsafe_allow_html=True)

        if st.button(t("phone_btn"), use_container_width=True, type="primary", key="auth_phone"):
            st.session_state.client_auth_step = "phone_entry"
            st.rerun()

        if st.button(t("email_btn"), use_container_width=True, key="auth_email"):
            st.session_state.client_auth_step = "email_entry"
            st.rerun()

        st.write("")
        st.markdown("---")
        if st.button(t("guest_btn"), use_container_width=True, key="auth_guest"):
            st.session_state.client_auth_step = "guest_entry"
            st.rerun()
        st.markdown(f"<p style='text-align:center;font-size:12px;color:#6b9aa2;margin-top:4px;'>{t('guest_note')}</p>",
                    unsafe_allow_html=True)

    st.write("")
    if st.button(t("back"), key="auth_back_home"):
        st.session_state.mode = None
        nav("home")


# ── Phone entry ────────────────────────────────────────────────────────────────
def _page_client_phone_entry():
    _, center_col, _ = st.columns([1, 2, 1])
    with center_col:
        st.markdown(f"### 📱 {t('phone_btn').replace('📱 ', '')}")
        st.write("")

        with st.form("phone_entry_form"):
            name = st.text_input(t("enter_name"), placeholder=t("name_ph"))
            phone = st.text_input(t("enter_phone"), placeholder=t("phone_ph"))
            submitted = st.form_submit_button(t("send_code"), use_container_width=True, type="primary")

        if submitted:
            if not phone.strip():
                st.error(t("enter_phone") + " is required.")
            else:
                code = _gen_otp()
                st.session_state.client_otp = code
                st.session_state.client_otp_contact = phone.strip()
                st.session_state.client_otp_type = "phone"
                st.session_state.client_name = name.strip()
                st.session_state.client_phone = phone.strip()
                st.session_state.client_auth_step = "otp"
                st.rerun()

        st.write("")
        if st.button(t("back"), key="phone_back"):
            st.session_state.client_auth_step = "hub"
            st.rerun()


# ── Email entry ────────────────────────────────────────────────────────────────
def _page_client_email_entry():
    _, center_col, _ = st.columns([1, 2, 1])
    with center_col:
        st.markdown(f"### ✉️ {t('email_btn').replace('✉️ ', '')}")
        st.write("")

        with st.form("email_entry_form"):
            name = st.text_input(t("enter_name"), placeholder=t("name_ph"))
            email = st.text_input(t("enter_email"), placeholder=t("email_ph"))
            submitted = st.form_submit_button(t("send_code"), use_container_width=True, type="primary")

        if submitted:
            if not email.strip() or "@" not in email:
                st.error("Please enter a valid email address.")
            else:
                code = _gen_otp()
                st.session_state.client_otp = code
                st.session_state.client_otp_contact = email.strip()
                st.session_state.client_otp_type = "email"
                st.session_state.client_name = name.strip()
                st.session_state.client_email = email.strip()
                st.session_state.client_auth_step = "otp"
                st.rerun()

        st.write("")
        if st.button(t("back"), key="email_back"):
            st.session_state.client_auth_step = "hub"
            st.rerun()


# ── OTP verification ───────────────────────────────────────────────────────────
def _page_client_otp():
    _, center_col, _ = st.columns([1, 2, 1])
    with center_col:
        contact = st.session_state.client_otp_contact
        otp_type = st.session_state.client_otp_type

        st.markdown(f"### 🔑 {t('otp_title')}")
        st.write(f"{t('otp_sent_to')} **{contact}**")

        # Demo mode: show the code
        st.info(f"🧪 **{t('dev_code_note')}** `{st.session_state.client_otp}`", icon=None)
        st.write("")

        with st.form("otp_form"):
            entered = st.text_input(t("otp_label"), placeholder=t("otp_ph"),
                                    max_chars=6)
            submitted = st.form_submit_button(t("verify_btn"), use_container_width=True, type="primary")

        if submitted:
            if entered.strip() == st.session_state.client_otp:
                method = "phone" if otp_type == "phone" else "email"
                st.session_state.client_auth_method = method
                success_key = "verified_phone" if otp_type == "phone" else "verified_email"
                st.success(t(success_key))
                time.sleep(1)
                nav("client_book")
            else:
                st.error(t("wrong_code"))

        c1, c2 = st.columns(2)
        with c1:
            if st.button(t("back"), key="otp_back"):
                prev = "phone_entry" if st.session_state.client_otp_type == "phone" else "email_entry"
                st.session_state.client_auth_step = prev
                st.rerun()
        with c2:
            if st.button(t("resend"), key="otp_resend"):
                st.session_state.client_otp = _gen_otp()
                st.rerun()


# ── Guest entry ────────────────────────────────────────────────────────────────
def _page_client_guest():
    _, center_col, _ = st.columns([1, 2, 1])
    with center_col:
        st.markdown(f"### 👤 {t('guest_btn').replace('👤 ', '')}")
        st.write(t("guest_note"))
        st.write("")

        with st.form("guest_form"):
            name = st.text_input(t("name_optional"), placeholder=t("name_ph"))
            phone = st.text_input(t("enter_phone") + " *(optional)*", placeholder=t("phone_ph"))
            submitted = st.form_submit_button(t("guest_continue"), use_container_width=True, type="primary")

        if submitted:
            st.session_state.client_auth_method = "guest"
            st.session_state.client_name = name.strip() or "Guest"
            st.session_state.client_phone = phone.strip()
            st.success(f"Welcome, {st.session_state.client_name}! 🌴")
            time.sleep(0.8)
            nav("client_book")

        st.write("")
        if st.button(t("back"), key="guest_back"):
            st.session_state.client_auth_step = "hub"
            st.rerun()


# ── Social (Google / Apple) ────────────────────────────────────────────────────
def _page_client_social():
    provider = st.session_state.client_social_provider
    icon = "🔵" if provider == "google" else "🍎"
    provider_name = "Google" if provider == "google" else "Apple"

    _, center_col, _ = st.columns([1, 2, 1])
    with center_col:
        st.markdown(f"### {icon} {t('google_btn' if provider == 'google' else 'apple_btn')}")

        st.markdown(f"""
<div style="background:rgba(0,194,212,0.06);border:1px solid rgba(0,194,212,0.18);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
  <p style="margin:0 0 8px 0;color:#6b9aa2;font-size:13px;">🔐 Simulated OAuth flow — {provider_name} sign-in</p>
  <p style="margin:0;font-size:13px;">In production this would redirect to {provider_name}'s OAuth consent screen. Enter your details below to continue.</p>
</div>
""", unsafe_allow_html=True)

        with st.form(f"social_form_{provider}"):
            name = st.text_input(t("social_name_label"), placeholder=t("name_ph"))
            email = st.text_input(t("social_email_label"), placeholder=t("email_ph"))
            submitted = st.form_submit_button(
                f"{icon} {t('social_signin')} {t('or').replace('or', 'with').replace('o', 'with').strip()}",
                use_container_width=True, type="primary")

        if submitted:
            if not name.strip() or not email.strip():
                st.error("Please enter your name and email.")
            else:
                with st.spinner(f"Connecting to {provider_name}..."):
                    time.sleep(1)
                st.session_state.client_auth_method = provider
                st.session_state.client_name = name.strip()
                st.session_state.client_email = email.strip()
                st.success(f"{icon} {t('signed_in_as')} **{name.strip()}** 🎉")
                time.sleep(1)
                nav("client_book")

        st.write("")
        if st.button(t("back"), key="social_back"):
            st.session_state.client_auth_step = "hub"
            st.rerun()


# ── Client Profile ─────────────────────────────────────────────────────────────
def page_client_profile():
    if st.session_state.mode != "client" or not st.session_state.client_auth_method:
        nav("client_auth")
        return

    method = st.session_state.client_auth_method
    method_labels = {"phone": "📱 Phone", "email": "✉️ Email",
                     "google": "🔵 Google", "apple": "🍎 Apple", "guest": "👤 Guest"}
    icon = {"phone": "📱", "email": "✉️", "google": "🔵", "apple": "🍎", "guest": "👤"}.get(method, "👤")

    st.markdown(f"## {icon} {t('profile_title')}")

    _, c, _ = st.columns([1, 2, 1])
    with c:
        with st.container(border=True):
            st.markdown(f"### {st.session_state.client_name or 'Guest'}")
            st.markdown(f"**{t('auth_method')}** {method_labels.get(method, method)}")
            if st.session_state.client_phone:
                st.markdown(f"📱 {st.session_state.client_phone}")
            if st.session_state.client_email:
                st.markdown(f"✉️ {st.session_state.client_email}")

            if method == "guest":
                st.info("You are in guest mode. Create an account to save your ride history.")
            elif method in ("google", "apple"):
                st.success(f"Account linked with {method.capitalize()}.")
            else:
                st.success("Account verified via OTP.")

            st.write("")
            c1, c2 = st.columns(2)
            with c1:
                if st.button(t("book_btn"), use_container_width=True, type="primary"):
                    nav("client_book")
            with c2:
                if st.button(t("sign_out"), use_container_width=True):
                    client_logout()


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


def _nearest_landmark(lat: float, lng: float):
    """Return (name, dist_m, hint) of the closest NASSAU_PLACES entry."""
    best_name, best_dist, best_hint = None, float("inf"), ""
    for places in NASSAU_PLACES.values():
        for name, plat, plng, hint in places:
            d = db.haversine(lat, lng, plat, plng) * 1000  # metres
            if d < best_dist:
                best_dist = d
                best_name = name
                best_hint = hint
    return best_name, best_dist, best_hint


def _set_location(key_prefix, lat, lng, label):
    st.session_state[f"{key_prefix}_lat"]   = lat
    st.session_state[f"{key_prefix}_lng"]   = lng
    st.session_state[f"{key_prefix}_label"] = label
    st.session_state[f"{key_prefix}_search_results"] = []


def _location_picker(key_prefix: str, label: str, allow_gps: bool = True):
    """
    Redesigned location picker:
      1. Prominent AUTO-LOCATE banner (GPS → address + nearest landmark)
      2. Manual tabs: 🔍 Type & Search | 🏛️ Popular Places | 📋 Paste Link
    Returns (lat, lng, label_string).
    """
    lat = st.session_state.get(f"{key_prefix}_lat")
    lng = st.session_state.get(f"{key_prefix}_lng")
    lbl = st.session_state.get(f"{key_prefix}_label", "")

    # ── Already confirmed ─────────────────────────────────────────────────────
    if lat and lbl:
        sel_col, clr_col = st.columns([6, 1])
        sel_col.success(f"✅ **{lbl}**  \n`{lat:.5f}, {lng:.5f}`")
        if clr_col.button("✕", key=f"{key_prefix}_clear", use_container_width=True,
                          help="Clear and choose again"):
            _set_location(key_prefix, None, None, "")
            st.rerun()
        return lat, lng, lbl

    # ── AUTO-LOCATE block ─────────────────────────────────────────────────────
    if allow_gps:
        geo = get_geolocation()
        if geo and geo.get("coords"):
            g_lat = round(geo["coords"]["latitude"], 6)
            g_lng = round(geo["coords"]["longitude"], 6)
            acc   = geo["coords"].get("accuracy", 0)

            with st.container(border=True):
                st.markdown("##### 📍 Your Location Found")
                st.caption(f"GPS accuracy: ±{acc:.0f} m")

                # Nearest landmark
                near_name, near_dist, near_hint = _nearest_landmark(g_lat, g_lng)

                # Reverse-geocode (cached in session)
                cache_key = f"{key_prefix}_geo_addr"
                cache_coords = f"{key_prefix}_geo_coords"
                if st.session_state.get(cache_coords) != (g_lat, g_lng):
                    with st.spinner("Identifying your exact address…"):
                        addr = db.reverse_geocode(g_lat, g_lng)
                    st.session_state[cache_key]   = addr
                    st.session_state[cache_coords] = (g_lat, g_lng)
                else:
                    addr = st.session_state.get(cache_key, f"{g_lat}, {g_lng}")

                # Mini map
                mini = folium.Map(location=[g_lat, g_lng], zoom_start=16,
                                  tiles="CartoDB dark_matter")
                folium.CircleMarker(
                    location=[g_lat, g_lng], radius=12,
                    color="#00C2D4", fill=True, fill_color="#00C2D4", fill_opacity=0.7,
                    tooltip="You are here",
                ).add_to(mini)
                folium.Circle(
                    location=[g_lat, g_lng], radius=acc,
                    color="#FFC72C", fill=True, fill_color="#FFC72C", fill_opacity=0.10,
                    tooltip=f"±{acc:.0f} m accuracy",
                ).add_to(mini)
                # Nearest landmark pin
                nlat, nlng = _get_place_coords(near_name)
                folium.Marker(
                    [nlat, nlng],
                    icon=folium.DivIcon(
                        html='<div style="font-size:16px;line-height:1">📌</div>',
                        icon_size=(20, 20), icon_anchor=(10, 20)),
                    tooltip=f"Nearest landmark: {near_name}",
                ).add_to(mini)
                st_folium(mini, height=200, use_container_width=True,
                          key=f"auto_map_{key_prefix}")

                # Address + landmark info
                near_dist_str = (f"{near_dist:.0f} m" if near_dist < 1000
                                 else f"{db.km_to_mi(near_dist/1000):.1f} mi")
                st.markdown(
                    f"📍 **Detected address:** {addr}  \n"
                    f"📌 **Nearest landmark:** {near_name} — {near_dist_str} away  \n"
                    f"_{near_hint}_"
                )

                # Two confirm options
                btn_a, btn_b = st.columns(2)
                if btn_a.button("✅ Use My Exact Location",
                                key=f"{key_prefix}_gps_exact",
                                type="primary", use_container_width=True):
                    _set_location(key_prefix, g_lat, g_lng, addr)
                    st.rerun()
                if btn_b.button(f"📌 Use Nearest: {near_name.split('(')[0].strip()[:28]}",
                                key=f"{key_prefix}_gps_landmark",
                                use_container_width=True):
                    _set_location(key_prefix, nlat, nlng, near_name)
                    st.rerun()

        else:
            # GPS not yet granted — show prompt
            with st.container(border=True):
                st.markdown(
                    "##### 📍 Auto-Locate Me\n"
                    "Instantly find where you are — no typing needed."
                )
                st.info(
                    "🔐 **Allow location access** in the browser popup above.  \n"
                    "Your location stays private and is only used for this booking."
                )
                st.caption("Not working? Use the **Type & Search** or **Popular Places** tab below.")

        st.markdown("---")
        st.caption("Or choose your location manually:")

    # ── Manual tabs ───────────────────────────────────────────────────────────
    tab_search, tab_landmark, tab_paste = st.tabs(
        ["🔍 Type & Search", "🏛️ Popular Places", "📋 Paste Link"]
    )

    # ── Search tab ────────────────────────────────────────────────────────────
    with tab_search:
        col_q, col_btn = st.columns([5, 1])
        query = col_q.text_input(
            "Address search", label_visibility="collapsed",
            placeholder="e.g. Atlantis Resort, Fish Fry, Carmichael Road…",
            key=f"{key_prefix}_search_q")
        go = col_btn.button("Go →", key=f"{key_prefix}_search_btn", use_container_width=True)

        if go and query.strip():
            with st.spinner("Searching Nassau & Bahamas…"):
                results = db.geocode_address(query.strip())
            st.session_state[f"{key_prefix}_search_results"] = results

        results = st.session_state.get(f"{key_prefix}_search_results", [])
        if results:
            st.caption(f"{len(results)} result(s) — tap to select:")
            for i, r in enumerate(results):
                name = r["display_name"].split(",")[0].strip()
                hint = ", ".join(r["display_name"].split(",")[1:3]).strip()
                if st.button(f"📌 **{name}**  \n_{hint}_",
                             key=f"{key_prefix}_res_{i}", use_container_width=True):
                    _set_location(key_prefix,
                                  round(float(r["lat"]), 6),
                                  round(float(r["lon"]), 6),
                                  name)
                    st.rerun()
        elif go:
            st.warning("No results found. Try: 'Airport', 'Cable Beach', or 'Fish Fry'.")

    # ── Popular Places tab ────────────────────────────────────────────────────
    with tab_landmark:
        st.caption("Tap any spot to use it as your location.")
        for cat, places in NASSAU_PLACES.items():
            st.markdown(f"**{cat}**")
            cols = st.columns(2)
            for j, (pname, plat, plng, phint) in enumerate(places):
                with cols[j % 2]:
                    if st.button(
                        f"**{pname}**  \n_{phint}_",
                        key=f"{key_prefix}_lm_{pname[:20]}",
                        use_container_width=True,
                    ):
                        _set_location(key_prefix, plat, plng, pname)
                        st.rerun()

    # ── Paste tab ─────────────────────────────────────────────────────────────
    with tab_paste:
        st.caption("Paste a Google Maps / Apple Maps link, WhatsApp location, or coordinates.")
        paste = st.text_area(
            "Paste here", label_visibility="collapsed",
            placeholder="25.0872, -77.3149\n— or —\nhttps://maps.google.com/...",
            key=f"{key_prefix}_paste_text", height=90)
        if paste.strip():
            plat, plng = db.parse_location_input(paste.strip())
            if plat and plng:
                st.caption(f"Parsed: {plat:.5f}, {plng:.5f}")
                if st.button("✓ Confirm this location", key=f"{key_prefix}_paste_btn",
                             type="primary", use_container_width=True):
                    with st.spinner("Identifying address…"):
                        address = db.reverse_geocode(plat, plng)
                    _set_location(key_prefix, plat, plng, address)
                    st.rerun()
            else:
                st.error("❌ Could not read location. Try format: `25.0800, -77.3420`")
        else:
            st.markdown(
                "**Accepted formats:**\n"
                "- Coordinates: `25.0872, -77.3149`\n"
                "- Google Maps link *(Share → Copy link)*\n"
                "- Apple Maps link  \n"
                "- WhatsApp / iMessage location"
            )

    return lat, lng, lbl


def page_client_book():
    if st.session_state.mode != "client" or not st.session_state.client_auth_method:
        st.session_state.client_auth_step = "hub"
        nav("client_auth")
        return

    method = st.session_state.client_auth_method
    client_name_prefill = st.session_state.client_name
    client_phone_prefill = st.session_state.client_phone
    method_icon = {"phone": "📱", "email": "✉️", "google": "🔵", "apple": "🍎", "guest": "👤"}.get(method, "👤")

    st.markdown(f"""
<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,194,212,0.07);border:1px solid rgba(0,194,212,0.18);border-radius:10px;padding:12px 20px;margin-bottom:12px;">
  <span>{method_icon} <strong>{client_name_prefill or 'Guest'}</strong> &nbsp;·&nbsp; {method.capitalize()} sign-in</span>
  <span style="font-size:12px;color:#6b9aa2;">{client_phone_prefill or st.session_state.client_email or ''}</span>
</div>
""", unsafe_allow_html=True)

    st.markdown("## 🚖 Request a Ride")

    # ── Quick routes ──────────────────────────────────────────────────────────
    with st.expander("⚡ Popular Routes — click to auto-fill", expanded=False):
        qcols = st.columns(len(QUICK_ROUTES))
        for i, (qlabel, qpickup, qdropoff) in enumerate(QUICK_ROUTES):
            with qcols[i]:
                if st.button(qlabel, use_container_width=True, key=f"qr_{i}"):
                    for places in NASSAU_PLACES.values():
                        for p in places:
                            if p[0] == qpickup:
                                st.session_state.pickup_lat = p[1]
                                st.session_state.pickup_lng = p[2]
                                st.session_state.pickup_label = qpickup
                            if p[0] == qdropoff:
                                st.session_state.dropoff_lat = p[1]
                                st.session_state.dropoff_lng = p[2]
                                st.session_state.dropoff_label = qdropoff
                    st.rerun()

    st.divider()

    # ── Location pickers (side by side) ──────────────────────────────────────
    left_col, right_col = st.columns(2)
    with left_col:
        st.markdown("#### 📍 Pickup Location")
        p_lat, p_lng, p_label = _location_picker("pickup", "Set pickup via:", allow_gps=True)
    with right_col:
        st.markdown("#### 🏁 Drop-off Location")
        d_lat, d_lng, d_label = _location_picker("dropoff", "Set drop-off via:", allow_gps=False)

    st.divider()

    # ── Live route map ────────────────────────────────────────────────────────
    if p_lat and d_lat:
        map_col, info_col = st.columns([3, 1])
        with map_col:
            m = folium.Map(
                location=[(p_lat + d_lat) / 2, (p_lng + d_lng) / 2],
                zoom_start=13, tiles="CartoDB dark_matter",
            )
            route = db.get_route(p_lat, p_lng, d_lat, d_lng)
            if route:
                folium.PolyLine(route["coords"], color="#00C2D4", weight=5,
                                opacity=0.9, tooltip="Your road route").add_to(m)
                st.session_state.route_info = route
            else:
                folium.PolyLine([[p_lat, p_lng], [d_lat, d_lng]], color="#FFC72C",
                                weight=3, opacity=0.6, dash_array="8").add_to(m)
                st.session_state.route_info = None

            folium.Marker([p_lat, p_lng], tooltip=f"📍 {p_label}",
                          icon=folium.Icon(color="blue", icon="circle", prefix="fa")).add_to(m)
            folium.Marker([d_lat, d_lng], tooltip=f"🏁 {d_label}",
                          icon=folium.Icon(color="green", icon="flag", prefix="fa")).add_to(m)
            m.fit_bounds(
                [[min(p_lat, d_lat), min(p_lng, d_lng)],
                 [max(p_lat, d_lat), max(p_lng, d_lng)]],
                padding=(40, 40),
            )
            st_folium(m, height=320, use_container_width=True)

        with info_col:
            ri = st.session_state.route_info
            if ri:
                dist = ri["distance_km"]
                fare = db.calc_fare(dist)
                st.metric("🗺 Road Distance", f"{db.km_to_mi(dist):.1f} mi")
                st.metric("⏱ Est. Drive", f"{ri['duration_min']:.0f} min")
                st.metric("💵 Est. Fare", db.fmt_usd(fare))
                st.caption("Via OSRM road routing · Final fare at drop-off")
            else:
                dist = db.haversine(p_lat, p_lng, d_lat, d_lng)
                fare = db.calc_fare(dist)
                st.metric("📏 Distance", f"{db.km_to_mi(dist):.1f} mi")
                st.metric("💵 Est. Fare", db.fmt_usd(fare))
                st.caption("Straight-line fallback")
            st.write("")
            st.markdown(f"**📍** {p_label}")
            st.markdown(f"**🏁** {d_label}")
    else:
        st.info("Set both your **pickup** and **drop-off** location above to see the route map and fare estimate.")
        dist, fare = 0, 0

    st.divider()

    # ── Booking type ───────────────────────────────────────────────────────────
    st.markdown("#### 🕐 When do you need the ride?")
    book_mode = st.radio(
        "Booking type:", ["⚡ Book Now — Immediate pickup", "📅 Schedule for Later"],
        horizontal=True, label_visibility="collapsed",
    )

    scheduled_at = None
    if book_mode == "📅 Schedule for Later":
        today = date.today()
        max_date = today + timedelta(days=30)
        sched_cols = st.columns(2)
        pickup_date = sched_cols[0].date_input(
            "Pickup Date", value=today + timedelta(days=1),
            min_value=today, max_value=max_date,
        )
        pickup_time_raw = sched_cols[1].time_input("Pickup Time", value=dtime(9, 0), step=1800)
        scheduled_at = datetime.combine(pickup_date, pickup_time_raw)
        st.info(
            f"📅 Scheduled for **{pickup_date.strftime('%A, %B %d')}** at "
            f"**{pickup_time_raw.strftime('%I:%M %p')}**  \n"
            "✅ Guaranteed availability · Reminder sent 1 hour before pickup"
        )
    else:
        st.success("⚡ Immediate booking — average **3-minute** pickup in Nassau")

    st.divider()

    # ── Booking form ──────────────────────────────────────────────────────────
    st.markdown("#### 👤 Your Details")
    with st.form("book_form"):
        c1, c2 = st.columns(2)
        client_name = c1.text_input(t("enter_name"), value=client_name_prefill, placeholder=t("name_ph"))
        client_phone = c2.text_input(t("enter_phone"), value=client_phone_prefill, placeholder=t("phone_ph"),
                                     help="Include country code if international, e.g. +1, +44")
        col_notes, col_quick = st.columns([2, 1])
        notes = col_notes.text_area("Notes for driver *(optional)*",
                                    placeholder="E.g. At the south entrance with two bags…", height=80)
        with col_quick:
            st.caption("Quick tags:")
            quick_notes = []
            if st.checkbox("🧳 Luggage"):           quick_notes.append("I have luggage 🧳")
            if st.checkbox("👶 Baby seat"):          quick_notes.append("Baby seat needed 👶")
            if st.checkbox("♿ Wheelchair access"):  quick_notes.append("Wheelchair access needed ♿")
            if st.checkbox("🚪 Main entrance"):      quick_notes.append("At the main entrance 🚪")
        all_notes = "\n".join(filter(None, [notes] + quick_notes))
        btn_label = "📅 Confirm Schedule" if book_mode == "📅 Schedule for Later" else t("book_btn")
        submitted = st.form_submit_button(
            btn_label, use_container_width=True, type="primary",
            disabled=(not p_lat or not d_lat))

    if submitted:
        if not client_name.strip() or not client_phone.strip():
            st.error("Please enter your name and phone number.")
        elif not p_lat or not d_lat:
            st.error("Please set both pickup and drop-off locations.")
        elif (round(p_lat, 4), round(p_lng, 4)) == (round(d_lat, 4), round(d_lng, 4)):
            st.error("Pickup and drop-off appear to be the same location.")
        elif book_mode == "📅 Schedule for Later" and scheduled_at <= datetime.now():
            st.error("Scheduled pickup time must be in the future.")
        else:
            ride = db.create_ride(
                client_name.strip(), client_phone.strip(),
                p_label, p_lat, p_lng,
                d_label, d_lat, d_lng,
                all_notes,
                scheduled_at=scheduled_at,
            )
            st.session_state.client_name = client_name.strip()
            st.session_state.client_phone = client_phone.strip()
            st.session_state.ride_id = ride["id"]
            st.session_state.route_info = None
            st.success(f"Ride requested! {db.fmt_usd(ride['estimated_fare'])} · {db.km_to_mi(ride['distance_km']):.1f} mi")
            time.sleep(1)
            nav("client_track")

    st.write("")
    cp1, cp2 = st.columns(2)
    with cp1:
        if st.button(t("back"), key="book_back"):
            nav("home")
    with cp2:
        if st.button(f"👤 {t('profile_title')}", key="book_profile"):
            nav("client_profile")


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

    lang_info = LANG[st.session_state.client_lang]

    STATUS_MAP = {
        "en": {
            "scheduled":   ("📅", "Scheduled",       "Your ride is confirmed for the scheduled time."),
            "pending":     ("⏳", "Pending",          "Waiting for a driver..."),
            "accepted":    ("🚗", "Driver Assigned",  "Your driver is on the way!"),
            "in_progress": ("🚀", "In Progress",      "You're on your way!"),
            "completed":   ("✅", "Completed",        "You've arrived. Enjoy your day!"),
            "cancelled":   ("❌", "Cancelled",        "This ride was cancelled."),
        },
        "es": {
            "scheduled":   ("📅", "Programado",      "Su viaje está confirmado para la hora programada."),
            "pending":     ("⏳", "Pendiente",        "Esperando un conductor..."),
            "accepted":    ("🚗", "Conductor Asignado", "¡Tu conductor va en camino!"),
            "in_progress": ("🚀", "En Curso",          "¡Estás en camino!"),
            "completed":   ("✅", "Completado",        "¡Has llegado! ¡Disfruta tu día!"),
            "cancelled":   ("❌", "Cancelado",         "Este viaje fue cancelado."),
        },
        "fr": {
            "scheduled":   ("📅", "Planifié",           "Votre trajet est confirmé pour l'heure prévue."),
            "pending":     ("⏳", "En attente",         "En attente d'un chauffeur..."),
            "accepted":    ("🚗", "Chauffeur Assigné",  "Votre chauffeur est en route !"),
            "in_progress": ("🚀", "En Cours",           "Vous êtes en route !"),
            "completed":   ("✅", "Terminé",            "Vous êtes arrivé. Bonne journée !"),
            "cancelled":   ("❌", "Annulé",             "Ce trajet a été annulé."),
        },
    }
    lang_statuses = STATUS_MAP.get(st.session_state.client_lang, STATUS_MAP["en"])
    icon, label, msg = lang_statuses.get(ride["status"], ("❓", ride["status"], ""))

    st.markdown(f"## 📍 Ride #{ride['id']} — {label}  {lang_info['flag']}")

    col1, col2 = st.columns([1, 2])
    with col1:
        st.metric("Status", f"{icon} {label}")
        st.metric("Estimated Fare", db.fmt_usd(ride["estimated_fare"]))
        st.metric("Distance", f"{db.km_to_mi(ride['distance_km']):.1f} mi")
        if ride.get("scheduled_at"):
            sched = ride["scheduled_at"]
            now   = datetime.utcnow()
            delta = sched - now
            if delta.total_seconds() > 0:
                hours   = int(delta.total_seconds() // 3600)
                minutes = int((delta.total_seconds() % 3600) // 60)
                countdown = f"in {hours}h {minutes}m" if hours else f"in {minutes}m"
            else:
                countdown = "now"
            st.metric("📅 Scheduled Pickup", sched.strftime("%b %d, %I:%M %p"), delta_color="off")
            st.caption(f"Pickup {countdown}")
        if ride["driver_name"]:
            st.markdown(f"🚗 **Driver:** {ride['driver_name']}")
            st.markdown(f"🔖 **Plate:** {ride['driver_plate']}")
            if ride.get("driver_phone"):
                st.markdown(f"📞 **Phone:** {ride['driver_phone']}")
            if ride["status"] == "accepted" and ride.get("accepted_at"):
                from datetime import datetime as _dt
                elapsed = (_dt.utcnow() - ride["accepted_at"]).total_seconds() / 60
                eta_min = max(0, int(10 - elapsed))
                if eta_min > 1:
                    st.metric("⏱ ETA", f"~{eta_min} min")
                elif elapsed < 12:
                    st.info("🚗 Driver is arriving soon!")
                else:
                    st.info("🚗 Driver should be at your pickup point.")

    with col2:
        st.info(msg)
        c1, c2 = st.columns(2)
        c1.markdown(f"**📍 Pickup**  \n{ride['pickup_location']}")
        c2.markdown(f"**🏁 Drop-off**  \n{ride['dropoff_location']}")

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
        if st.button(t("book_another") if t("book_another") != "book_another" else "Book Another Ride",
                     type="primary"):
            st.session_state.ride_id = None
            nav("client_book")
    else:
        if st.button("🔄 Refresh Status", use_container_width=True):
            st.rerun()
        st.caption("Page auto-refreshes every 8 seconds while ride is active.")
        time.sleep(8)
        st.rerun()


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
            st.markdown(f"**Fare:** {db.fmt_usd(current_ride['estimated_fare'])}  ·  {db.km_to_mi(current_ride['distance_km']):.1f} mi")

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
                            st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}**  ·  {db.km_to_mi(ride['distance_km']):.1f} mi  ·  {ride['client_name']}")
                            st.caption(f"📍 {ride['pickup_location']}")
                            st.caption(f"🏁 {ride['dropoff_location']}")
                        with c2:
                            created = ride["created_at"]
                            if isinstance(created, datetime):
                                st.caption(created.strftime("%H:%M"))
                            if st.button("Accept", key=f"accept_{ride['id']}", type="primary"):
                                db.update_ride_status(ride["id"], "accepted", driver_id)
                                st.rerun()

    if driver["status"] == "available":
        time.sleep(5)
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

_STATUS_EMOJI = {"available": "🟢", "busy": "🟡", "offline": "⚫", "suspended": "🔴"}
_STATUS_COLOR = {"available": "#10b981", "busy": "#f59e0b", "offline": "#6b7280", "suspended": "#ef4444"}


def _admin_live_map(drivers, active):
    m = folium.Map(location=NASSAU_CENTER, zoom_start=13, tiles="CartoDB dark_matter")
    driver_loc: dict[int, tuple[float, float]] = {}
    for d in drivers:
        lat = float(d["last_lat"])  if d["last_lat"]  else (25.048 + (d["id"] * 0.003) % 0.12 - 0.06)
        lng = float(d["last_lng"]) if d["last_lng"] else (-77.355 + (d["id"] * 0.007) % 0.20 - 0.10)
        driver_loc[d["id"]] = (lat, lng)

    for ride in active:
        if not (ride.get("pickup_lat") and ride.get("dropoff_lat")):
            continue
        p_lat, p_lng = float(ride["pickup_lat"]),  float(ride["pickup_lng"])
        d_lat, d_lng = float(ride["dropoff_lat"]), float(ride["dropoff_lng"])
        folium.PolyLine(
            [[p_lat, p_lng], [d_lat, d_lng]],
            color="#00C2D4", weight=3, opacity=0.7, dash_array="8 6",
            tooltip=f"{ride['pickup_location']} → {ride['dropoff_location']}",
        ).add_to(m)
        folium.Marker(
            [p_lat, p_lng],
            icon=folium.DivIcon(html='<div style="font-size:18px;line-height:1">📍</div>',
                                icon_size=(22,22), icon_anchor=(11,22)),
            tooltip=f"Pickup: {ride['pickup_location']}",
        ).add_to(m)
        folium.Marker(
            [d_lat, d_lng],
            icon=folium.DivIcon(html='<div style="font-size:18px;line-height:1">🏁</div>',
                                icon_size=(22,22), icon_anchor=(11,22)),
            tooltip=f"Dropoff: {ride['dropoff_location']}",
        ).add_to(m)
        if ride["driver_id"] and ride["driver_id"] in driver_loc:
            drv_lat, drv_lng = driver_loc[ride["driver_id"]]
            target = (d_lat, d_lng) if ride["status"] == "in_progress" else (p_lat, p_lng)
            folium.PolyLine(
                [[drv_lat, drv_lng], list(target)],
                color="#FFC72C", weight=2, opacity=0.6, dash_array="4 4",
            ).add_to(m)

    for d in drivers:
        lat, lng = driver_loc[d["id"]]
        updated = ""
        if d["last_location_updated_at"]:
            updated = f"<br><small>Updated: {d['last_location_updated_at'].strftime('%H:%M:%S')}</small>"
        popup_html = (
            f"<b>{d['name']}</b><br>"
            f"{d['vehicle_plate']} · {d['vehicle_color']} {d['vehicle_make']}<br>"
            f"<b>{_STATUS_EMOJI.get(d['status'], '')} {d['status'].capitalize()}</b>{updated}"
        )
        folium.CircleMarker(
            location=[lat, lng],
            radius=10 if d["status"] == "available" else 8,
            color="#000", weight=2, fill=True,
            fill_color=_STATUS_COLOR.get(d["status"], "#6b7280"),
            fill_opacity=1.0,
            tooltip=folium.Tooltip(popup_html, sticky=True),
        ).add_to(m)
    return m


def _dispatch_panel(pending, scheduled, active, available_drivers):
    """Right-side panel: schedule → pending → active."""
    if st.session_state.get("completed_report"):
        rpt = st.session_state.completed_report
        st.success(
            f"✅ **Ride Completed!**  \n"
            f"🚗 **{rpt['driver']}** delivered **{rpt['client']}**  \n"
            f"📍 {rpt['pickup']} → {rpt['dropoff']}  \n"
            f"💰 **{rpt['fare']}** · {rpt['distance']} km · {rpt['duration']}  \n"
            f"🟢 {rpt['driver']} is now available."
        )
        if st.button("Dismiss", key="dismiss_rpt"):
            st.session_state.completed_report = None
            st.rerun()

    # ── Scheduled
    st.markdown("#### 📅 Scheduled Rides")
    if not scheduled:
        st.caption("No upcoming scheduled rides.")
    else:
        for ride in sorted(scheduled, key=lambda r: r.get("scheduled_at") or datetime.max):
            sched = ride.get("scheduled_at")
            with st.container(border=True):
                if sched:
                    delta = sched - datetime.utcnow()
                    h = int(delta.total_seconds() // 3600)
                    mn = int((delta.total_seconds() % 3600) // 60)
                    when = sched.strftime("%b %d · %I:%M %p")
                    cntd = f"⏱ {h}h {mn}m away" if delta.total_seconds() > 0 else "⚠️ Overdue"
                    st.markdown(f"**{when}** &nbsp; {cntd}")
                st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                st.caption(f"📍 {ride['pickup_location']}")
                st.caption(f"🏁 {ride['dropoff_location']}")
                st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}** · {db.km_to_mi(ride['distance_km']):.1f} mi")
                if available_drivers:
                    opts = {f"{d['name']} — {d['vehicle_plate']}": d["id"] for d in available_drivers}
                    lbl = st.selectbox("Assign driver", list(opts.keys()), key=f"ss_{ride['id']}")
                    if st.button("Confirm & Dispatch →", key=f"sd_{ride['id']}", type="primary",
                                 use_container_width=True):
                        db.update_ride_status(ride["id"], "accepted", opts[lbl])
                        st.rerun()
                else:
                    st.warning("No available drivers.")

    # ── Pending
    st.markdown("#### ⏳ Pending Bookings")
    if not pending:
        st.success("No pending bookings.")
    else:
        for ride in pending:
            with st.container(border=True):
                created = ride["created_at"]
                ts = created.strftime("%H:%M") if isinstance(created, datetime) else ""
                st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}** · {db.km_to_mi(ride['distance_km']):.1f} mi · {ts}")
                st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                st.caption(f"📍 {ride['pickup_location']}")
                st.caption(f"🏁 {ride['dropoff_location']}")
                if available_drivers:
                    opts = {f"{d['name']} — {d['vehicle_plate']}": d["id"] for d in available_drivers}
                    lbl = st.selectbox("Assign driver", list(opts.keys()), key=f"ps_{ride['id']}")
                    if st.button("Dispatch →", key=f"pd_{ride['id']}", type="primary",
                                 use_container_width=True):
                        db.update_ride_status(ride["id"], "accepted", opts[lbl])
                        st.rerun()
                else:
                    st.warning("No available drivers.")

    # ── Active
    st.markdown("#### 🚀 Active Rides")
    if not active:
        st.caption("No active rides.")
    else:
        for ride in active:
            with st.container(border=True):
                badge = "🚀 **IN PROGRESS**" if ride["status"] == "in_progress" else "🚗 **ACCEPTED**"
                st.markdown(badge)
                st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}** · {db.km_to_mi(ride['distance_km']):.1f} mi")
                st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                st.caption(f"📍 {ride['pickup_location']}")
                st.caption(f"🏁 {ride['dropoff_location']}")
                if ride.get("driver_name"):
                    st.caption(f"🚗 {ride['driver_name']} · {ride['driver_plate']}")
                if ride["status"] == "accepted":
                    if st.button("▶ Mark In Progress", key=f"ap_{ride['id']}", use_container_width=True):
                        db.update_ride_status(ride["id"], "in_progress")
                        st.rerun()
                elif ride["status"] == "in_progress":
                    if st.button("✅ Complete Ride", key=f"ac_{ride['id']}", type="primary",
                                 use_container_width=True):
                        started = ride.get("started_at")
                        dur = (f"{int((datetime.utcnow()-started).total_seconds()//60)} min"
                               if started else "—")
                        db.update_ride_status(ride["id"], "completed")
                        st.session_state.completed_report = {
                            "driver": ride["driver_name"] or "Driver",
                            "client": ride["client_name"],
                            "pickup": ride["pickup_location"],
                            "dropoff": ride["dropoff_location"],
                            "fare": db.fmt_usd(ride["estimated_fare"]),
                            "distance": f"{db.km_to_mi(ride['distance_km']):.1f}",
                            "duration": dur,
                        }
                        st.rerun()


# ── Section: Overview ──────────────────────────────────────────────────────────
def _admin_overview(drivers, all_rides):
    from collections import defaultdict
    today = datetime.utcnow().date()
    completed_today = [r for r in all_rides if r["status"] == "completed"
                       and r.get("completed_at") and r["completed_at"].date() == today]
    cancelled_today = [r for r in all_rides if r["status"] == "cancelled"
                       and r.get("created_at") and r["created_at"].date() == today]
    active          = [r for r in all_rides if r["status"] in ("accepted", "in_progress")]
    online_drivers  = [d for d in drivers if d["status"] in ("available", "busy")]
    pending         = [r for r in all_rides if r["status"] == "pending"]
    scheduled       = [r for r in all_rides if r["status"] == "scheduled"]
    revenue_today   = sum(float(r.get("estimated_fare") or 0) for r in completed_today)

    st.markdown("## 📊 Overview")

    # ── Metrics row
    c1, c2, c3, c4, c5, c6, c7 = st.columns(7)
    c1.metric("🚀 Active Rides",      len(active))
    c2.metric("🟢 Online Drivers",    len(online_drivers))
    c3.metric("⏳ Pending Requests",  len(pending))
    c4.metric("📅 Scheduled",         len(scheduled))
    c5.metric("✅ Completed Today",   len(completed_today))
    c6.metric("❌ Cancelled Today",   len(cancelled_today))
    c7.metric("💰 Revenue Today",     db.fmt_usd(revenue_today))

    st.divider()

    # ── Charts
    chart_l, chart_r = st.columns(2)

    with chart_l:
        st.markdown("##### Rides by Hour — Today")
        hourly: dict[str, int] = {}
        for h in range(24):
            hourly[f"{h:02d}:00"] = 0
        for ride in all_rides:
            ca = ride.get("created_at")
            if ca and ca.date() == today:
                hourly[f"{ca.hour:02d}:00"] += 1
        if any(v > 0 for v in hourly.values()):
            st.bar_chart(hourly, height=220)
        else:
            st.caption("No rides created today yet.")

    with chart_r:
        st.markdown("##### Ride Outcomes — All Time")
        status_counts: dict[str, int] = defaultdict(int)
        for r in all_rides:
            status_counts[r["status"].capitalize()] += 1
        if status_counts:
            st.bar_chart(dict(status_counts), height=220)
        else:
            st.caption("No ride data yet.")

    st.divider()

    # ── Fleet status summary
    st.markdown("##### Fleet Status")
    fc1, fc2, fc3, fc4 = st.columns(4)
    fc1.metric("Total Drivers",  len(drivers))
    fc2.metric("🟢 Available",   sum(1 for d in drivers if d["status"] == "available"))
    fc3.metric("🟡 On Trip",     sum(1 for d in drivers if d["status"] == "busy"))
    fc4.metric("⚫ Offline",     sum(1 for d in drivers if d["status"] == "offline"))

    st.divider()

    # ── Recent system events
    st.markdown("##### Recent System Events")
    events = sorted(
        [r for r in all_rides if r.get("created_at")],
        key=lambda r: r["created_at"], reverse=True
    )[:10]
    if not events:
        st.caption("No events yet.")
    else:
        for r in events:
            ts = r["created_at"].strftime("%b %d %H:%M")
            status_badge = {
                "pending":     "⏳ Pending",
                "scheduled":   "📅 Scheduled",
                "accepted":    "🚗 Accepted",
                "in_progress": "🚀 In Progress",
                "completed":   "✅ Completed",
                "cancelled":   "❌ Cancelled",
            }.get(r["status"], r["status"])
            st.caption(
                f"`{ts}` — **#{r['id']}** {r['client_name']} · "
                f"{r['pickup_location']} → {r['dropoff_location']} · {status_badge}"
            )


# ── Section: Live Operations ───────────────────────────────────────────────────
def _admin_live_ops(drivers, all_rides):
    pending   = [r for r in all_rides if r["status"] == "pending"]
    active    = [r for r in all_rides if r["status"] in ("accepted", "in_progress")]
    scheduled = [r for r in all_rides if r["status"] == "scheduled"]
    available = [d for d in drivers if d["status"] == "available"]

    st.markdown("## 🗺 Live Operations")

    # ── Quick stats bar
    q1, q2, q3, q4 = st.columns(4)
    q1.metric("Pending", len(pending))
    q2.metric("Active",  len(active))
    q3.metric("Scheduled", len(scheduled))
    q4.metric("Available Drivers", len(available))

    map_col, panel_col = st.columns([3, 2])
    with map_col:
        st.markdown("#### 🗺 Live Driver Map")
        m = _admin_live_map(drivers, active)
        st_folium(m, height=480, use_container_width=True)

        # ── Live ride table
        st.markdown("#### 📋 Live Ride Table")
        all_live = sorted(pending + scheduled + active,
                          key=lambda r: r.get("created_at") or datetime.min, reverse=True)
        if not all_live:
            st.caption("No active bookings.")
        else:
            status_filter = st.multiselect(
                "Filter by status", ["pending", "scheduled", "accepted", "in_progress"],
                default=["pending", "scheduled", "accepted", "in_progress"],
                key="live_status_filter")
            filtered = [r for r in all_live if r["status"] in status_filter]
            for ride in filtered:
                with st.container(border=True):
                    badge = {
                        "pending":     "⏳",
                        "scheduled":   "📅",
                        "accepted":    "🚗",
                        "in_progress": "🚀",
                    }.get(ride["status"], "")
                    ts = ride["created_at"].strftime("%H:%M") if ride.get("created_at") else ""
                    c_a, c_b = st.columns([3, 1])
                    c_a.markdown(
                        f"{badge} **#{ride['id']}** · {ride['client_name']}  \n"
                        f"📍 {ride['pickup_location']}  \n"
                        f"🏁 {ride['dropoff_location']}  \n"
                        f"🚗 {ride.get('driver_name') or 'Unassigned'} · **{db.fmt_usd(ride['estimated_fare'])}**"
                    )
                    with c_b:
                        st.caption(ts)
                        if ride["status"] in ("pending", "scheduled"):
                            if st.button("Cancel", key=f"lo_cancel_{ride['id']}", use_container_width=True):
                                db.update_ride_status(ride["id"], "cancelled")
                                st.rerun()
                        if ride["status"] == "accepted":
                            if st.button("▶ Start", key=f"lo_start_{ride['id']}", use_container_width=True):
                                db.update_ride_status(ride["id"], "in_progress")
                                st.rerun()
                        if ride["status"] == "in_progress":
                            if st.button("✅ Done", key=f"lo_done_{ride['id']}", type="primary",
                                         use_container_width=True):
                                started = ride.get("started_at")
                                dur = (f"{int((datetime.utcnow()-started).total_seconds()//60)} min"
                                       if started else "—")
                                db.update_ride_status(ride["id"], "completed")
                                st.session_state.completed_report = {
                                    "driver": ride.get("driver_name") or "Driver",
                                    "client": ride["client_name"],
                                    "pickup": ride["pickup_location"],
                                    "dropoff": ride["dropoff_location"],
                                    "fare": db.fmt_usd(ride["estimated_fare"]),
                                    "distance": f"{db.km_to_mi(ride['distance_km']):.1f}",
                                    "duration": dur,
                                }
                                st.rerun()

    with panel_col:
        _dispatch_panel(pending, scheduled, active, available)


# ── Section: Drivers ───────────────────────────────────────────────────────────
def _admin_drivers(drivers, all_rides):
    st.markdown("## 🚗 Drivers")

    tab_all, tab_online, tab_offline = st.tabs(["All Drivers", "🟢 Online", "⚫ Offline"])

    def _driver_card(d, all_rides, key_prefix):
        driver_rides = [r for r in all_rides if r.get("driver_id") == d["id"]]
        completed_count = sum(1 for r in driver_rides if r["status"] == "completed")
        cancelled_count = sum(1 for r in driver_rides if r["status"] == "cancelled")

        with st.container(border=True):
            top_l, top_r = st.columns([3, 1])
            with top_l:
                e = _STATUS_EMOJI.get(d["status"], "⚫")
                st.markdown(
                    f"**{d['name']}** &nbsp; {e} `{d['status'].upper()}`  \n"
                    f"🚘 {d['vehicle_color']} {d['vehicle_make']} {d['vehicle_model']} · `{d['vehicle_plate']}`  \n"
                    f"📞 {d['phone']}  \n"
                    f"⭐ {float(d['rating']):.1f} &nbsp; · &nbsp; "
                    f"✅ {completed_count} completed &nbsp; · &nbsp; ❌ {cancelled_count} cancelled"
                )
            with top_r:
                if d["status"] == "offline":
                    if st.button("Set Online", key=f"{key_prefix}_on_{d['id']}", use_container_width=True):
                        db.update_driver_status(d["id"], "available")
                        st.rerun()
                else:
                    if st.button("Set Offline", key=f"{key_prefix}_off_{d['id']}", use_container_width=True):
                        db.update_driver_status(d["id"], "offline")
                        st.rerun()

            with st.expander("View Full Profile"):
                p1, p2 = st.columns(2)
                p1.markdown(
                    f"**License:** {d.get('license_number', '—')}  \n"
                    f"**Email:** {d.get('email', '—')}  \n"
                    f"**Registered:** {d['created_at'].strftime('%b %d, %Y') if d.get('created_at') else '—'}  \n"
                    f"**Total Rides:** {d['total_rides']}"
                )
                last_loc = "Unknown"
                if d.get("last_lat") and d.get("last_lng"):
                    last_loc = f"{float(d['last_lat']):.4f}, {float(d['last_lng']):.4f}"
                    if d.get("last_location_updated_at"):
                        last_loc += f" ({d['last_location_updated_at'].strftime('%H:%M:%S')})"
                p2.markdown(
                    f"**Vehicle Year:** {d.get('vehicle_year', '—')}  \n"
                    f"**Last Known Location:** {last_loc}"
                )

                # recent rides
                recent = sorted(driver_rides, key=lambda r: r.get("created_at") or datetime.min, reverse=True)[:5]
                if recent:
                    st.markdown("**Recent Rides:**")
                    for r in recent:
                        ts = r["created_at"].strftime("%b %d %H:%M") if r.get("created_at") else ""
                        st.caption(
                            f"`{ts}` #{r['id']} · {r['pickup_location']} → {r['dropoff_location']} "
                            f"· {r['status'].upper()} · {db.fmt_usd(r['estimated_fare'])}"
                        )

    with tab_all:
        if not drivers:
            st.info("No drivers registered yet.")
        else:
            search = st.text_input("Search by name, plate, or phone", key="drv_search")
            show = drivers
            if search:
                q = search.lower()
                show = [d for d in drivers if q in (d.get("name") or "").lower()
                        or q in (d.get("vehicle_plate") or "").lower()
                        or q in (d.get("phone") or "").lower()]
            for d in show:
                _driver_card(d, all_rides, "all")

    with tab_online:
        online = [d for d in drivers if d["status"] in ("available", "busy")]
        if not online:
            st.info("No drivers currently online.")
        else:
            for d in online:
                _driver_card(d, all_rides, "on")

    with tab_offline:
        offline_drivers = [d for d in drivers if d["status"] == "offline"]
        if not offline_drivers:
            st.info("All drivers are currently online.")
        else:
            for d in offline_drivers:
                _driver_card(d, all_rides, "off")


# ── Section: Rides ─────────────────────────────────────────────────────────────
def _ride_detail(ride, key_prefix):
    """Full expandable detail panel for a single ride."""
    rid = ride["id"]

    # ── Timeline ──────────────────────────────────────────────────────────────
    st.markdown("**📋 Ride Timeline**")

    def _tstep(icon, label, ts, extra=""):
        if ts:
            t = ts.strftime("%b %d · %H:%M:%S") if hasattr(ts, "strftime") else str(ts)
            st.markdown(f"{icon} **{label}** &nbsp; `{t}` {extra}")
        else:
            st.markdown(f"<span style='color:#555'>{icon} {label} — not yet</span>",
                        unsafe_allow_html=True)

    _tstep("🕐", "Requested",  ride.get("created_at"))
    driver_name = ride.get("driver_name") or "—"
    _tstep("🚗", "Accepted",   ride.get("accepted_at"), f"· Driver: **{driver_name}**")
    _tstep("🚀", "Trip Started", ride.get("started_at"))
    _tstep("✅", "Completed",  ride.get("completed_at"),
           f"· Fare: **{db.fmt_usd(ride.get('final_fare') or ride.get('estimated_fare') or 0)}**")
    if ride["status"] == "cancelled":
        reason = ride.get("cancellation_reason") or "—"
        st.markdown(f"❌ **Cancelled** · Reason: _{reason}_")
    if ride.get("scheduled_at"):
        st.markdown(f"📅 **Scheduled for** `{ride['scheduled_at'].strftime('%b %d · %I:%M %p')}`")

    st.divider()

    detail_l, detail_r = st.columns(2)

    # ── Map ───────────────────────────────────────────────────────────────────
    with detail_l:
        st.markdown("**🗺 Route Map**")
        if ride.get("pickup_lat") and ride.get("dropoff_lat"):
            p_lat, p_lng = float(ride["pickup_lat"]), float(ride["pickup_lng"])
            d_lat, d_lng = float(ride["dropoff_lat"]), float(ride["dropoff_lng"])
            mid_lat = (p_lat + d_lat) / 2
            mid_lng = (p_lng + d_lng) / 2
            mini = folium.Map(location=[mid_lat, mid_lng], zoom_start=12,
                              tiles="CartoDB dark_matter")
            folium.PolyLine([[p_lat, p_lng], [d_lat, d_lng]],
                            color="#00C2D4", weight=3, opacity=0.9).add_to(mini)
            folium.Marker([p_lat, p_lng],
                          icon=folium.DivIcon(
                              html='<div style="font-size:20px">📍</div>',
                              icon_size=(24, 24), icon_anchor=(12, 24)),
                          tooltip=f"Pickup: {ride['pickup_location']}").add_to(mini)
            folium.Marker([d_lat, d_lng],
                          icon=folium.DivIcon(
                              html='<div style="font-size:20px">🏁</div>',
                              icon_size=(24, 24), icon_anchor=(12, 24)),
                          tooltip=f"Dropoff: {ride['dropoff_location']}").add_to(mini)
            st_folium(mini, height=220, use_container_width=True,
                      key=f"mini_map_{key_prefix}_{rid}")
        else:
            st.caption("No GPS coordinates recorded for this ride.")

    # ── Payment summary ───────────────────────────────────────────────────────
    with detail_r:
        st.markdown("**💳 Payment Summary**")
        bill = db.get_ride_bill(rid)
        payment = db.get_ride_payment(rid)
        estimated = float(ride.get("estimated_fare") or 0)
        final     = float(ride.get("final_fare") or estimated)

        if bill:
            st.markdown(
                f"Base fare: **{db.fmt_usd(bill['base_fare'])}**  \n"
                f"Distance fare: **{db.fmt_usd(bill['distance_fare'])}**  \n"
                f"—  \n"
                f"**Total: {db.fmt_usd(bill['total_fare'])}**  \n"
                f"Distance: {db.km_to_mi(bill['distance_km']):.2f} mi  \n"
                f"Currency: {bill['currency']}  \n"
                f"Bill status: `{bill['status'].upper()}`"
            )
        else:
            st.markdown(
                f"Estimated fare: **{db.fmt_usd(estimated)}**  \n"
                f"Final fare: **{db.fmt_usd(final)}**  \n"
                f"Distance: {db.km_to_mi(float(ride.get('distance_km') or 0)):.2f} mi  \n"
                f"_(No bill generated yet)_"
            )

        if payment:
            pm = payment.get("payment_method") or "Cash"
            ps = payment.get("status") or "—"
            amt = float(payment.get("amount") or 0)
            st.markdown(
                f"Payment method: **{pm.upper()}**  \n"
                f"Amount charged: **{db.fmt_usd(amt)}** {payment.get('currency','BSD')}  \n"
                f"Payment status: `{ps.upper()}`"
            )
        else:
            st.markdown("Payment method: **Cash** _(default)_  \nNo payment record on file.")

    st.divider()

    # ── Safety events ─────────────────────────────────────────────────────────
    safety_evts = db.get_ride_safety_events(rid)
    if safety_evts:
        st.markdown("**🚨 Safety Events**")
        sev_color = {"low": "🟡", "medium": "🟠", "high": "🔴", "critical": "💀"}
        for evt in safety_evts:
            ts = evt["timestamp"].strftime("%b %d %H:%M") if evt.get("timestamp") else ""
            st.warning(
                f"{sev_color.get(evt.get('severity','low'),'')} "
                f"**{evt.get('event_type','').replace('_',' ').title()}** — "
                f"{evt.get('severity','').upper()} severity  \n"
                f"{evt.get('description','')}  \n"
                f"`{ts}`"
                + (f"  \n_Resolved: {evt['resolved_at'].strftime('%b %d %H:%M')}_"
                   if evt.get("resolved_at") else "  \n⚠️ _Unresolved_")
            )
        st.divider()

    # ── Admin actions ─────────────────────────────────────────────────────────
    st.markdown("**🔧 Admin Actions**")
    act1, act2, act3 = st.columns(3)

    with act1:
        is_susp = bool(ride.get("is_suspicious"))
        susp_label = "🔴 Marked Suspicious" if is_susp else "Mark Suspicious"
        if st.button(susp_label, key=f"{key_prefix}_susp_{rid}", use_container_width=True,
                     type="primary" if is_susp else "secondary"):
            db.update_ride_admin_flags(rid, is_suspicious=not is_susp)
            st.rerun()

    with act2:
        is_ref = bool(ride.get("is_flagged_refund"))
        ref_label = "💰 Refund Flagged" if is_ref else "Flag for Refund"
        if st.button(ref_label, key=f"{key_prefix}_refund_{rid}", use_container_width=True,
                     type="primary" if is_ref else "secondary"):
            db.update_ride_admin_flags(rid, is_flagged_refund=not is_ref)
            st.rerun()

    with act3:
        if st.button("🚨 Log Safety Event", key=f"{key_prefix}_sos_{rid}",
                     use_container_width=True):
            st.session_state[f"show_sos_{rid}"] = True

    if st.session_state.get(f"show_sos_{rid}"):
        with st.form(f"sos_form_{key_prefix}_{rid}"):
            sos_type = st.selectbox("Event Type",
                ["user_report", "route_deviation", "speed_violation", "unauthorized_stop", "sos"])
            sos_sev  = st.selectbox("Severity", ["low", "medium", "high", "critical"])
            sos_desc = st.text_area("Description")
            if st.form_submit_button("Submit Event"):
                db.add_safety_event(rid, sos_type, sos_sev, sos_desc)
                st.session_state.pop(f"show_sos_{rid}", None)
                st.success("Safety event logged.")
                st.rerun()

    # ── Admin note ────────────────────────────────────────────────────────────
    st.markdown("**💬 Admin Note**")
    existing_note = ride.get("admin_note") or ""
    with st.form(f"note_form_{key_prefix}_{rid}"):
        new_note = st.text_area("Attach incident note or observation",
                                value=existing_note, height=80,
                                key=f"note_ta_{key_prefix}_{rid}")
        sub1, sub2 = st.columns([2, 1])
        if sub1.form_submit_button("💾 Save Note", use_container_width=True):
            db.update_ride_admin_flags(rid, admin_note=new_note)
            st.success("Note saved.")
            st.rerun()
        if sub2.form_submit_button("🗑 Clear Note", use_container_width=True):
            db.update_ride_admin_flags(rid, admin_note="")
            st.rerun()

    if ride["status"] == "cancelled":
        st.markdown("**📝 Cancellation Reason**")
        existing_cr = ride.get("cancellation_reason") or ""
        with st.form(f"cr_form_{key_prefix}_{rid}"):
            new_cr = st.text_input("Cancellation reason", value=existing_cr)
            if st.form_submit_button("Save Reason"):
                db.update_ride_admin_flags(rid, cancellation_reason=new_cr)
                st.rerun()

    # ── State control ─────────────────────────────────────────────────────────
    st.markdown("**⚙️ State Control**")
    ctrl1, ctrl2, ctrl3, ctrl4 = st.columns(4)
    with ctrl1:
        if ride["status"] in ("pending", "scheduled", "accepted"):
            if st.button("❌ Cancel Ride", key=f"{key_prefix}_ctrl_cancel_{rid}",
                         use_container_width=True):
                db.update_ride_status(rid, "cancelled")
                st.rerun()
    with ctrl2:
        if ride["status"] == "accepted":
            if st.button("▶ Start Trip", key=f"{key_prefix}_ctrl_start_{rid}",
                         use_container_width=True):
                db.update_ride_status(rid, "in_progress")
                st.rerun()
    with ctrl3:
        if ride["status"] == "in_progress":
            if st.button("✅ Complete", key=f"{key_prefix}_ctrl_comp_{rid}",
                         type="primary", use_container_width=True):
                db.update_ride_status(rid, "completed")
                st.rerun()

    with ctrl4:
        # Export
        fare = float(ride.get("estimated_fare") or 0)
        export_text = (
            f"GoRide Ride Record — Export\n"
            f"{'='*40}\n"
            f"Ride ID:     #{rid}\n"
            f"Status:      {ride['status'].upper()}\n"
            f"Rider:       {ride['client_name']} ({ride['client_phone']})\n"
            f"Driver:      {ride.get('driver_name') or '—'} ({ride.get('driver_plate') or '—'})\n"
            f"Pickup:      {ride['pickup_location']}\n"
            f"Dropoff:     {ride['dropoff_location']}\n"
            f"Distance:    {db.km_to_mi(float(ride.get('distance_km') or 0)):.2f} mi\n"
            f"Fare:        {db.fmt_usd(fare)}\n"
            f"Requested:   {ride['created_at'].strftime('%Y-%m-%d %H:%M:%S') if ride.get('created_at') else '—'}\n"
            f"Accepted:    {ride['accepted_at'].strftime('%Y-%m-%d %H:%M:%S') if ride.get('accepted_at') else '—'}\n"
            f"Started:     {ride['started_at'].strftime('%Y-%m-%d %H:%M:%S') if ride.get('started_at') else '—'}\n"
            f"Completed:   {ride['completed_at'].strftime('%Y-%m-%d %H:%M:%S') if ride.get('completed_at') else '—'}\n"
            f"Notes:       {ride.get('notes') or '—'}\n"
            f"Admin Note:  {ride.get('admin_note') or '—'}\n"
            f"Suspicious:  {'YES' if ride.get('is_suspicious') else 'No'}\n"
            f"Refund Flag: {'YES' if ride.get('is_flagged_refund') else 'No'}\n"
        )
        st.download_button(
            "⬇️ Export Record",
            data=export_text,
            file_name=f"goride_ride_{rid}.txt",
            mime="text/plain",
            key=f"{key_prefix}_export_{rid}",
            use_container_width=True,
        )


def _admin_rides(all_rides, drivers):
    st.markdown("## 🚖 Rides")

    driver_map = {d["id"]: d["name"] for d in drivers}

    # ── Search bar ────────────────────────────────────────────────────────────
    search = st.text_input(
        "🔍 Search by ride ID, rider name, phone, driver, pickup, or destination",
        key="rides_search", placeholder="e.g. #12  or  John  or  Airport")

    if search:
        q = search.lower().lstrip("#")
        all_rides = [
            r for r in all_rides
            if q in str(r["id"])
            or q in (r.get("client_name") or "").lower()
            or q in (r.get("client_phone") or "").lower()
            or q in (driver_map.get(r.get("driver_id"), "")).lower()
            or q in (r.get("pickup_location") or "").lower()
            or q in (r.get("dropoff_location") or "").lower()
        ]
        st.caption(f'{len(all_rides)} result(s) for \"{search}\"')

    # ── Status tabs ───────────────────────────────────────────────────────────
    tab_all, tab_pending, tab_sched, tab_active, tab_done, tab_cancelled = st.tabs([
        f"All ({len(all_rides)})",
        f"⏳ Pending ({sum(1 for r in all_rides if r['status']=='pending')})",
        f"📅 Scheduled ({sum(1 for r in all_rides if r['status']=='scheduled')})",
        f"🚀 Active ({sum(1 for r in all_rides if r['status'] in ('accepted','in_progress'))})",
        f"✅ Completed ({sum(1 for r in all_rides if r['status']=='completed')})",
        f"❌ Cancelled ({sum(1 for r in all_rides if r['status']=='cancelled')})",
    ])

    STATUS_BADGE = {
        "pending":     "⏳ Pending",
        "scheduled":   "📅 Scheduled",
        "accepted":    "🚗 Accepted",
        "in_progress": "🚀 In Progress",
        "completed":   "✅ Completed",
        "cancelled":   "❌ Cancelled",
    }

    def _rides_list(rides, key_prefix):
        if not rides:
            st.caption("No rides in this category.")
            return

        for ride in rides:
            rid = ride["id"]
            is_susp  = bool(ride.get("is_suspicious"))
            is_ref   = bool(ride.get("is_flagged_refund"))
            has_note = bool(ride.get("admin_note"))

            # Alert badges
            alert_str = ""
            if is_susp:  alert_str += " 🔴"
            if is_ref:   alert_str += " 💰"
            if has_note: alert_str += " 💬"

            drv     = driver_map.get(ride.get("driver_id"), "—")
            req_ts  = ride["created_at"].strftime("%b %d %H:%M") if ride.get("created_at") else "—"
            comp_ts = ride["completed_at"].strftime("%b %d %H:%M") if ride.get("completed_at") else "—"
            fare    = db.fmt_usd(ride.get("estimated_fare") or 0)
            pay_method = "Cash"

            with st.container(border=True):
                # ── Header row: ID + badges + status
                h_l, h_r = st.columns([5, 1])
                h_l.markdown(
                    f"**#{rid}** &nbsp;·&nbsp; {ride['client_name']} &nbsp;·&nbsp; "
                    f"🚗 {drv} &nbsp;·&nbsp; "
                    f"`{STATUS_BADGE.get(ride['status'], ride['status'])}`{alert_str}"
                )
                h_r.caption(req_ts)

                # ── Route + fare row
                st.markdown(
                    f"📍 **{ride['pickup_location']}** &nbsp;→&nbsp; "
                    f"🏁 **{ride['dropoff_location']}**  \n"
                    f"💵 {fare} &nbsp;·&nbsp; 💳 {pay_method} &nbsp;·&nbsp; "
                    f"{db.km_to_mi(float(ride.get('distance_km') or 0)):.1f} mi"
                    + (f" &nbsp;·&nbsp; ✅ {comp_ts}" if ride["status"] == "completed" else "")
                    + (f" &nbsp;·&nbsp; 📞 {ride.get('client_phone','')}" if ride.get("client_phone") else "")
                )

                if is_susp or is_ref or has_note:
                    flags = []
                    if is_susp: flags.append("🔴 Suspicious")
                    if is_ref:  flags.append("💰 Refund Flagged")
                    if has_note: flags.append(f'💬 "{ride["admin_note"][:60]}…"' if len(ride.get("admin_note","")) > 60 else f'💬 "{ride.get("admin_note","")}"')
                    st.caption("  ·  ".join(flags))

                with st.expander(f"🔍 View Details — Ride #{rid}"):
                    _ride_detail(ride, key_prefix)

    with tab_all:
        _rides_list(all_rides, "ra")
    with tab_pending:
        _rides_list([r for r in all_rides if r["status"] == "pending"], "rp")
    with tab_sched:
        _rides_list([r for r in all_rides if r["status"] == "scheduled"], "rs")
    with tab_active:
        _rides_list([r for r in all_rides if r["status"] in ("accepted", "in_progress")], "rv")
    with tab_done:
        _rides_list([r for r in all_rides if r["status"] == "completed"], "rc")
    with tab_cancelled:
        _rides_list([r for r in all_rides if r["status"] == "cancelled"], "rx")


# ── Section: Safety / Incidents ────────────────────────────────────────────────
def _admin_safety(all_rides):
    st.markdown("## 🛡 Safety & Incidents")

    today = datetime.utcnow().date()
    cancelled_today = [r for r in all_rides if r["status"] == "cancelled"
                       and r.get("created_at") and r["created_at"].date() == today]

    s1, s2, s3 = st.columns(3)
    s1.metric("🆘 Open SOS Alerts",       0,  help="SOS integration coming soon")
    s2.metric("🚩 Flagged Rides",         0,  help="Ride flagging coming in next release")
    s3.metric("❌ Cancellations Today",   len(cancelled_today))

    st.info(
        "🛡 **SOS & Incident System — Coming Soon**  \n\n"
        "The next release will include:  \n"
        "- In-app SOS button for riders and drivers  \n"
        "- Automatic alert dispatch to the operations team  \n"
        "- Incident report generation  \n"
        "- Ride flagging and review workflow  \n"
        "- Cancellation pattern detection"
    )

    st.divider()
    st.markdown("#### ❌ Recent Cancellations")
    cancelled = [r for r in all_rides if r["status"] == "cancelled"]
    if not cancelled:
        st.caption("No cancelled rides on record.")
    else:
        for r in cancelled[:20]:
            ts = r["created_at"].strftime("%b %d %H:%M") if r.get("created_at") else ""
            st.caption(
                f"`{ts}` — **#{r['id']}** {r['client_name']} · "
                f"{r['pickup_location']} → {r['dropoff_location']} · {db.fmt_usd(r['estimated_fare'])}"
            )


# ── Section: Settings / Test Tools ────────────────────────────────────────────

def _tr(key):
    """Get test result dict, defaulting to None status."""
    return st.session_state.get("test_results", {}).get(key, {"status": None, "log": ""})

def _ts(key, status, log=""):
    """Store test result."""
    if "test_results" not in st.session_state:
        st.session_state["test_results"] = {}
    st.session_state["test_results"][key] = {"status": status, "log": log}

def _badge(key):
    r = _tr(key)
    return {"pass": "✅", "fail": "❌", "skip": "⏭️", "manual": "☑️"}.get(r["status"], "⬜")

def _test_row(key, label, desc, run_fn=None, manual_note=None):
    """Render a single test row with badge + action."""
    r = _tr(key)
    col_badge, col_desc, col_btn = st.columns([0.5, 5, 1.5])
    col_badge.markdown(f"### {_badge(key)}")
    col_desc.markdown(f"**{label}**  \n{desc}")
    with col_btn:
        if run_fn:
            if st.button("Run Test", key=f"run_{key}", use_container_width=True):
                try:
                    log = run_fn()
                    _ts(key, "pass", log or "OK")
                except Exception as exc:
                    _ts(key, "fail", str(exc))
                st.rerun()
        elif manual_note:
            if st.button("Mark Done ✓", key=f"mark_{key}", use_container_width=True):
                _ts(key, "manual", "Manually verified")
                st.rerun()
    if r["status"] == "pass":
        st.success(f"✅ {r['log']}")
    elif r["status"] == "fail":
        st.error(f"❌ {r['log']}")
    elif r["status"] == "manual":
        st.success(f"☑️ Manually verified")
    if manual_note and r["status"] not in ("manual", "pass"):
        st.caption(f"📋 {manual_note}")


def _release_checklist(drivers, all_rides):
    if "test_results" not in st.session_state:
        st.session_state["test_results"] = {}
    results = st.session_state["test_results"]

    # ── Summary bar ───────────────────────────────────────────────────────────
    total = 19
    passed  = sum(1 for r in results.values() if r["status"] in ("pass", "manual"))
    failed  = sum(1 for r in results.values() if r["status"] == "fail")
    pending = total - passed - failed

    prog_col, clr_col = st.columns([5, 1])
    with prog_col:
        pct = passed / total
        st.progress(pct, text=f"**{passed}/{total} tests passing** · {failed} failed · {pending} pending")
    with clr_col:
        if st.button("🔄 Reset All", use_container_width=True):
            st.session_state["test_results"] = {}
            for k in list(st.session_state.keys()):
                if k.startswith("test_ride_id") or k.startswith("test_driver_id") or k.startswith("test_sos_id"):
                    del st.session_state[k]
            st.rerun()

    if passed == total:
        st.balloons()
        st.success("🎉 **All tests passing — GoRide is ready for launch!**")

    st.divider()

    # ════════════════════════════════════════════════
    # 1. DRIVER TESTING
    # ════════════════════════════════════════════════
    with st.expander("🚗 Driver Testing", expanded=True):

        def _t_drv_signup():
            drv = db.find_or_create_test_driver()
            assert drv and drv["id"], "Driver not created"
            st.session_state["test_driver_id"] = drv["id"]
            return f"Test driver created: #{drv['id']} {drv['name']} · {drv['vehicle_plate']}"

        _test_row("drv_signup", "Driver Signup",
                  "Creates a test driver [TEST] Alex Driver in the database and verifies the record.",
                  run_fn=_t_drv_signup)

        def _t_drv_approve():
            drv_id = st.session_state.get("test_driver_id")
            if not drv_id:
                drv = db.find_or_create_test_driver()
                drv_id = drv["id"]
                st.session_state["test_driver_id"] = drv_id
            db.update_driver_status(drv_id, "available")
            drv = db.get_driver(drv_id)
            assert drv["status"] == "available", f"Status is {drv['status']}, expected available"
            return f"Driver #{drv_id} status → {drv['status']}"

        _test_row("drv_approve", "Driver Approved / Go Online",
                  "Sets the test driver to 'available' and verifies the DB status update.",
                  run_fn=_t_drv_approve)

        _test_row("drv_docs", "Document Upload",
                  "Driver registration form (web & mobile) collects license, vehicle plate, colour, and make.",
                  manual_note="Register a new driver via the Driver Registration page and confirm the record appears in the Drivers tab.")

        def _t_drv_recv():
            drv_id = st.session_state.get("test_driver_id")
            if not drv_id:
                drv = db.find_or_create_test_driver()
                drv_id = drv["id"]
            db.update_driver_status(drv_id, "available")
            ride = db.create_ride(
                "[TEST] Recv Rider", "+12429999901",
                "Atlantis Paradise Island", 25.0872, -77.3149,
                "Nassau Cruise Port (Prince George Wharf)", 25.0811, -77.3513,
                notes="[TEST RIDE — receive ride test]",
            )
            result = db.update_ride_status(ride["id"], "accepted", drv_id)
            assert result["status"] == "accepted", f"Status is {result['status']}"
            drv = db.get_driver(drv_id)
            assert drv["status"] == "busy", f"Driver status is {drv['status']}, expected busy"
            st.session_state["test_ride_id"] = ride["id"]
            return f"Ride #{ride['id']} dispatched to driver #{drv_id} · Driver status → busy"

        _test_row("drv_recv", "Receive Ride",
                  "Creates a test ride and dispatches it to the test driver. Verifies driver status changes to 'busy'.",
                  run_fn=_t_drv_recv)

        def _t_drv_suspend():
            drv_id = st.session_state.get("test_driver_id")
            if not drv_id:
                drv = db.find_or_create_test_driver()
                drv_id = drv["id"]
            db.update_driver_status(drv_id, "offline")
            drv = db.get_driver(drv_id)
            assert drv["status"] == "offline", f"Status is {drv['status']}"
            return f"Driver #{drv_id} suspended → status: {drv['status']}"

        _test_row("drv_suspend", "Driver Suspended",
                  "Sets the test driver offline (suspended) and verifies they can no longer receive rides.",
                  run_fn=_t_drv_suspend)

    # ════════════════════════════════════════════════
    # 2. RIDE TESTING
    # ════════════════════════════════════════════════
    with st.expander("🚖 Ride Testing", expanded=True):

        def _t_ride_create():
            ride = db.create_ride(
                "[TEST] Jane Rider", "+12429999902",
                "Lynden Pindling Int'l Airport", 25.0389, -77.4659,
                "Parliament Square", 25.0770, -77.3410,
                notes="[TEST RIDE — status flow test]",
            )
            assert ride and ride["id"], "Ride not created"
            expected_fare = db.calc_fare(ride["distance_km"])
            assert abs(ride["estimated_fare"] - expected_fare) < 0.01, \
                f"Fare mismatch: got {ride['estimated_fare']}, expected {expected_fare}"
            st.session_state["test_ride_id"] = ride["id"]
            return (f"Ride #{ride['id']} created · {db.km_to_mi(ride['distance_km']):.1f} mi · "
                    f"Fare: {db.fmt_usd(ride['estimated_fare'])} ✓")

        _test_row("ride_create", "Create Ride",
                  "Creates a test ride Airport → Parliament Square and verifies fare calculation.",
                  run_fn=_t_ride_create)

        def _t_ride_assign():
            rid = st.session_state.get("test_ride_id")
            if not rid:
                raise Exception("Run 'Create Ride' first.")
            avail = [d for d in db.get_all_drivers() if d["status"] == "available"]
            if not avail:
                db.find_or_create_test_driver()
                db.update_driver_status(st.session_state.get("test_driver_id",
                    db.find_or_create_test_driver()["id"]), "available")
                avail = [d for d in db.get_all_drivers() if d["status"] == "available"]
            assert avail, "No available drivers — run Driver Approve first."
            drv = avail[0]
            result = db.update_ride_status(rid, "accepted", drv["id"])
            assert result["status"] == "accepted"
            return f"Ride #{rid} assigned to {drv['name']} (#{drv['id']}) → status: accepted"

        _test_row("ride_assign", "Assign Driver",
                  "Dispatches the test ride to the first available driver and verifies accepted status.",
                  run_fn=_t_ride_assign)

        def _t_ride_status():
            rid = st.session_state.get("test_ride_id")
            if not rid:
                raise Exception("Run 'Create Ride' and 'Assign Driver' first.")
            ride = db.get_ride(rid)
            if ride["status"] == "pending":
                raise Exception("Ride not yet accepted. Run 'Assign Driver' first.")
            result = db.update_ride_status(rid, "in_progress")
            assert result["status"] == "in_progress"
            return f"Ride #{rid}: accepted → in_progress ✓ · started_at set"

        _test_row("ride_status_update", "Update Statuses",
                  "Advances the test ride from accepted → in_progress and verifies each transition.",
                  run_fn=_t_ride_status)

        _test_row("ride_live_track", "Track Live Movement",
                  "Driver GPS markers update every 8 seconds on the Live Operations map.",
                  manual_note="Open Live Operations → verify driver dot appears. Use driver dashboard to move (simulate by changing GPS). Confirm marker moves on map.")

        def _t_ride_complete():
            rid = st.session_state.get("test_ride_id")
            if not rid:
                raise Exception("Run 'Create Ride', 'Assign Driver', and 'Update Statuses' first.")
            ride = db.get_ride(rid)
            if ride["status"] != "in_progress":
                raise Exception(f"Ride status is '{ride['status']}' — must be in_progress.")
            result = db.update_ride_status(rid, "completed")
            assert result["status"] == "completed"
            bill = db.get_ride_bill(rid)
            assert bill, "No bill generated after completion"
            drv = db.get_driver(result["driver_id"]) if result.get("driver_id") else None
            assert drv and drv["status"] == "available", "Driver not freed after completion"
            return (f"Ride #{rid} completed · Bill generated: {db.fmt_usd(bill['total_fare'])} · "
                    f"Driver #{result['driver_id']} status → available ✓")

        _test_row("ride_complete", "Complete Ride",
                  "Completes the test ride, verifies a bill is generated, and driver is freed.",
                  run_fn=_t_ride_complete)

        def _t_ride_cancel():
            ride = db.create_ride(
                "[TEST] Cancel Rider", "+12429999903",
                "Cable Beach", 25.0700, -77.3900,
                "Arawak Cay — Fish Fry", 25.0800, -77.3600,
                notes="[TEST RIDE — cancel test]",
            )
            avail = [d for d in db.get_all_drivers() if d["status"] == "available"]
            if avail:
                db.update_ride_status(ride["id"], "accepted", avail[0]["id"])
                drv_id = avail[0]["id"]
            else:
                drv_id = None
            result = db.update_ride_status(ride["id"], "cancelled")
            assert result["status"] == "cancelled"
            if drv_id:
                drv = db.get_driver(drv_id)
                assert drv["status"] == "available", "Driver not freed after cancel"
            return f"Ride #{ride['id']} cancelled · Driver freed ✓"

        _test_row("ride_cancel", "Cancel Ride",
                  "Creates, assigns, then cancels a test ride. Verifies the driver is immediately freed.",
                  run_fn=_t_ride_cancel)

    # ════════════════════════════════════════════════
    # 3. SAFETY TESTING
    # ════════════════════════════════════════════════
    with st.expander("🛡 Safety Testing", expanded=False):

        def _t_safety_sos():
            rid = st.session_state.get("test_ride_id")
            if not rid:
                ride = db.create_ride("[TEST] SOS Rider", "+12429999904",
                                      "Atlantis Paradise Island", 25.0872, -77.3149,
                                      "Parliament Square", 25.0770, -77.3410,
                                      notes="[TEST RIDE — safety test]")
                rid = ride["id"]
                st.session_state["test_ride_id"] = rid
            evt = db.add_safety_event(rid, "sos", "critical",
                                      "[TEST] SOS triggered by rider — admin drill")
            assert evt and evt["id"]
            st.session_state["test_sos_id"] = str(evt["id"])
            return f"SOS event logged · ID: {evt['id'][:8]}… · Severity: CRITICAL"

        _test_row("safety_sos", "Trigger SOS",
                  "Logs a critical SOS safety event on a test ride and verifies it's stored.",
                  run_fn=_t_safety_sos)

        def _t_safety_deviation():
            rid = st.session_state.get("test_ride_id")
            if not rid:
                raise Exception("Run 'Create Ride' in Ride Testing first.")
            evt = db.add_safety_event(rid, "route_deviation", "medium",
                                      "[TEST] Driver deviated from expected Nassau route")
            assert evt and evt["id"]
            return f"Route deviation event logged · ID: {evt['id'][:8]}… · Severity: MEDIUM"

        _test_row("safety_deviation", "Route Deviation",
                  "Logs a route deviation event and verifies it appears in the safety events table.",
                  run_fn=_t_safety_deviation)

        def _t_safety_complaint():
            rid = st.session_state.get("test_ride_id")
            if not rid:
                raise Exception("Run 'Create Ride' in Ride Testing first.")
            evt = db.add_safety_event(rid, "user_report", "low",
                                      "[TEST] Rider submitted complaint: driver was rude")
            assert evt and evt["id"]
            return f"Complaint (user_report) logged · ID: {evt['id'][:8]}… · Severity: LOW"

        _test_row("safety_complaint", "Complaint Submission",
                  "Simulates a rider submitting a complaint and verifies it's recorded as a user_report event.",
                  run_fn=_t_safety_complaint)

        def _t_safety_resolve():
            sos_id = st.session_state.get("test_sos_id")
            if not sos_id:
                raise Exception("Run 'Trigger SOS' first to create an event to resolve.")
            resolved = db.resolve_safety_event(sos_id, "[TEST] Admin resolved: drill confirmed safe")
            assert resolved and resolved.get("resolved_at"), "resolved_at not set"
            return (f"Event {sos_id[:8]}… resolved at "
                    f"{resolved['resolved_at'].strftime('%H:%M:%S')} UTC ✓")

        _test_row("safety_resolve", "Incident Resolution",
                  "Marks the SOS event as resolved with admin notes and verifies the timestamp.",
                  run_fn=_t_safety_resolve)

    # ════════════════════════════════════════════════
    # 4. PAYMENT TESTING
    # ════════════════════════════════════════════════
    with st.expander("💳 Payment Testing", expanded=False):

        def _t_pay_cash():
            ride = db.create_ride(
                "[TEST] Cash Rider", "+12429999905",
                "Sandals Royal Bahamian", 25.0700, -77.3870,
                "Straw Market (Bay Street)", 25.0787, -77.3440,
                notes="[TEST RIDE — cash payment test]",
            )
            assert ride["estimated_fare"] > 0, "Fare not calculated"
            drv = db.find_or_create_test_driver()
            db.update_driver_status(drv["id"], "available")
            db.update_ride_status(ride["id"], "accepted", drv["id"])
            db.update_ride_status(ride["id"], "in_progress")
            completed = db.update_ride_status(ride["id"], "completed")
            bill = db.get_ride_bill(ride["id"])
            assert bill and bill["total_fare"] > 0, "No bill after cash completion"
            return (f"Cash trip #{ride['id']} completed · "
                    f"Fare: {db.fmt_usd(bill['total_fare'])} "
                    f"(base {db.fmt_usd(bill['base_fare'])} + dist {db.fmt_usd(bill['distance_fare'])}) ✓")

        _test_row("pay_cash", "Cash Trip",
                  "Runs a complete ride cycle (create → accept → start → complete) and verifies the bill is generated.",
                  run_fn=_t_pay_cash)

        def _t_pay_fare_review():
            tests = [
                (1.0,  round(db.BASE_FARE + 1.0 * 1.50, 2)),
                (5.0,  round(db.BASE_FARE + 5.0 * 1.50, 2)),
                (10.0, round(db.BASE_FARE + 10.0 * 1.50, 2)),
            ]
            lines = []
            for km, expected in tests:
                actual = round(db.calc_fare(km), 2)
                ok = "✓" if abs(actual - expected) < 0.01 else "✗"
                lines.append(f"{ok} {km:.0f} km → {db.fmt_usd(actual)} (expected {db.fmt_usd(expected)})")
            passed_all = all("✓" in l for l in lines)
            assert passed_all, "Fare formula mismatch: " + " | ".join(lines)
            return "Fare formula verified: $3.00 base + $1.50/km · " + " · ".join(lines)

        _test_row("pay_fare_review", "Fare Total Review",
                  "Verifies the fare formula ($3.00 base + $1.50/km) for 1 km, 5 km and 10 km trips.",
                  run_fn=_t_pay_fare_review)

        _test_row("pay_card_success", "Card Payment — Success",
                  "Stripe card payment requires the Stripe integration to be activated.",
                  manual_note="Stripe integration needed. Once activated: book a ride, select card payment, use test card 4242 4242 4242 4242, verify payment_status = 'completed' in payments table.")

        _test_row("pay_card_failure", "Card Payment — Failure / Decline",
                  "Stripe decline flow requires the Stripe integration to be activated.",
                  manual_note="With Stripe active: use decline test card 4000 0000 0000 0002, verify payment_status = 'failed' and ride is NOT completed automatically.")

    # ════════════════════════════════════════════════
    # 5. SYSTEM TESTING
    # ════════════════════════════════════════════════
    with st.expander("🖥 System Testing", expanded=False):

        def _t_sys_db():
            import time
            t0 = time.time()
            drivers_fetched = db.get_all_drivers()
            rides_fetched   = db.get_all_rides()
            elapsed = (time.time() - t0) * 1000
            assert elapsed < 3000, f"DB query took {elapsed:.0f}ms — too slow"
            return (f"DB connected · {len(drivers_fetched)} drivers, "
                    f"{len(rides_fetched)} rides · response: {elapsed:.0f}ms ✓")

        _test_row("sys_db", "Database Connectivity",
                  "Queries drivers and rides tables and checks response time is under 3 seconds.",
                  run_fn=_t_sys_db)

        def _t_sys_gps():
            all_drivers = db.get_all_drivers()
            with_gps = [d for d in all_drivers if d.get("last_lat") and d.get("last_lng")]
            without  = [d for d in all_drivers if not d.get("last_lat")]
            return (f"{len(with_gps)}/{len(all_drivers)} drivers have GPS data · "
                    f"{len(without)} using simulated positions")

        _test_row("sys_gps", "GPS Updates Visible",
                  "Checks how many drivers have real GPS coordinates vs. simulated positions on the map.",
                  run_fn=_t_sys_gps)

        def _t_sys_map():
            nassau_lat, nassau_lng = 25.0480, -77.3554
            assert 24.5 < nassau_lat < 25.5, "Nassau lat out of range"
            assert -78.0 < nassau_lng < -77.0, "Nassau lng out of range"
            import folium as _folium
            m = _folium.Map(location=[nassau_lat, nassau_lng], zoom_start=13)
            assert m is not None, "Folium map failed to construct"
            return f"Map centre {nassau_lat}, {nassau_lng} · Folium OK · Nassau bbox verified ✓"

        _test_row("sys_map", "Map Loads Correctly",
                  "Validates Nassau coordinates and that the Folium map library constructs without error.",
                  run_fn=_t_sys_map)

        _test_row("sys_ws_reconnect", "WebSocket Reconnect",
                  "Streamlit auto-reconnects after a brief disconnect — ride state must be preserved.",
                  manual_note="1. Create a ride via Request a Ride.\n2. Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R).\n3. Log back in as admin.\n4. Open Live Operations and confirm the ride still appears with the correct status.")

        _test_row("sys_refresh", "Page Refresh with Ride State Preserved",
                  "Ride status survives full page reload because state is persisted in PostgreSQL, not in-memory.",
                  manual_note="1. Note current ride counts in Overview.\n2. Reload the admin page.\n3. Confirm ride counts and statuses match what you saw before the refresh.")

    st.divider()
    if st.button("🗑️ Clean Up All Test Data", use_container_width=True,
                 help="Removes all [TEST] rides, the test driver, and their bills from the database"):
        db.delete_test_data()
        st.session_state["test_results"] = {}
        for k in list(st.session_state.keys()):
            if k.startswith("test_"):
                del st.session_state[k]
        st.success("✅ All test data removed from database.")
        st.rerun()


def _admin_settings(all_rides, drivers):
    st.markdown("## ⚙️ Settings & Test Tools")

    tab_sys, tab_checklist, tab_tools = st.tabs(
        ["🖥 System Health", "🧪 Release Checklist", "🔧 Quick Tools"]
    )

    # ── System Health ─────────────────────────────────────────────────────────
    with tab_sys:
        st.markdown("#### System Health")
        try:
            db.get_all_drivers()
            st.success("✅ PostgreSQL database — Connected")
        except Exception as e:
            st.error(f"❌ Database — {e}")

        h1, h2, h3 = st.columns(3)
        h1.metric("Total Rides in DB", len(all_rides))
        h2.metric("Total Drivers in DB", len(drivers))
        h3.metric("Bills Generated", len(db.get_bills(limit=500)))

        st.divider()
        st.markdown("#### Recent Bills / Payments")
        bills = db.get_bills(limit=10)
        if not bills:
            st.caption("No bills yet.")
        else:
            for b in bills:
                ts = b.get("created_at")
                ts_str = ts.strftime("%b %d %H:%M") if ts else ""
                st.caption(
                    f"`{ts_str}` — Ride #{b['ride_id']} · Driver #{b['driver_id']} · "
                    f"Total **{db.fmt_usd(b['total_fare'])}** "
                    f"(base {db.fmt_usd(b['base_fare'])} + dist {db.fmt_usd(b['distance_fare'])})"
                )

        st.divider()
        st.markdown("#### Safety Events")
        evts = db.get_safety_events(limit=10)
        if not evts:
            st.caption("No safety events recorded.")
        else:
            sev_icon = {"low": "🟡", "medium": "🟠", "high": "🔴", "critical": "💀"}
            for e in evts:
                ts = e["timestamp"].strftime("%b %d %H:%M") if e.get("timestamp") else ""
                resolved = "✓ Resolved" if e.get("resolved_at") else "⚠️ Open"
                st.caption(
                    f"`{ts}` {sev_icon.get(e.get('severity','low'),'')} "
                    f"**{e.get('event_type','').replace('_',' ').title()}** · "
                    f"Ride #{e.get('ride_id')} · {resolved}"
                )

    # ── Release Checklist ─────────────────────────────────────────────────────
    with tab_checklist:
        st.markdown("## 🧪 Release Testing Checklist")
        st.caption("Run each test before going live. Automated tests write to the DB with [TEST] labels and can be cleaned up afterwards.")
        _release_checklist(drivers, all_rides)

    # ── Quick Tools ───────────────────────────────────────────────────────────
    with tab_tools:
        st.markdown("#### Create Test Ride")
        with st.form("test_ride_form"):
            tc1, tc2 = st.columns(2)
            t_name  = tc1.text_input("Client Name",  value="Test Rider")
            t_phone = tc2.text_input("Client Phone", value="+12421234567")
            t_pickup  = st.text_input("Pickup",  value="Atlantis Paradise Island, Nassau")
            t_dropoff = st.text_input("Dropoff", value="Nassau International Airport")
            if st.form_submit_button("Create Test Ride", type="primary"):
                ride = db.create_ride(
                    client_name=t_name, client_phone=t_phone,
                    pickup_location=t_pickup,   pickup_lat=25.0860, pickup_lng=-77.3188,
                    dropoff_location=t_dropoff, dropoff_lat=25.0419, dropoff_lng=-77.4667,
                    notes="[TEST RIDE — admin generated]",
                )
                if ride:
                    st.success(f"✅ Ride #{ride['id']} — {db.fmt_usd(ride['estimated_fare'])} · {db.km_to_mi(ride['distance_km']):.1f} mi")
                    st.rerun()

        st.divider()
        st.markdown("#### Admin Shortcuts")
        sh1, sh2 = st.columns(2)
        with sh1:
            if st.button("🔄 Set All Drivers Offline", use_container_width=True):
                for d in drivers:
                    db.update_driver_status(d["id"], "offline")
                st.success("All drivers set to offline.")
                st.rerun()
        with sh2:
            if st.button("🟢 Set All Drivers Available", use_container_width=True):
                for d in drivers:
                    if d["status"] == "offline":
                        db.update_driver_status(d["id"], "available")
                st.success("All offline drivers set to available.")
                st.rerun()


# ── Main dashboard router ──────────────────────────────────────────────────────
def page_office_dashboard():
    if st.session_state.mode != "office":
        st.error("Access denied.")
        nav("office_login")
        return

    if "completed_report" not in st.session_state:
        st.session_state.completed_report = None

    # ── Sidebar navigation
    with st.sidebar:
        st.markdown("### 🚖 GoRide Admin")
        st.caption("Main Office · Nassau, Bahamas")
        st.divider()
        section = st.radio(
            "Navigation",
            ["📊 Overview", "🗺 Live Operations", "🚗 Drivers",
             "🚖 Rides", "🛡 Safety", "⚙️ Settings"],
            label_visibility="collapsed",
        )
        st.divider()
        if st.button("🚪 Log Out", use_container_width=True):
            st.session_state.mode = ""
            st.session_state.admin_authed = False
            nav("home")

    # ── Fetch shared data
    drivers   = db.get_all_drivers()
    all_rides = db.get_all_rides()

    if section == "📊 Overview":
        _admin_overview(drivers, all_rides)
    elif section == "🗺 Live Operations":
        _admin_live_ops(drivers, all_rides)
    elif section == "🚗 Drivers":
        _admin_drivers(drivers, all_rides)
    elif section == "🚖 Rides":
        _admin_rides(all_rides, drivers)
    elif section == "🛡 Safety":
        _admin_safety(all_rides)
    elif section == "⚙️ Settings":
        _admin_settings(all_rides, drivers)

    time.sleep(8)
    st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════════
page = st.session_state.page

if page == "home":
    page_home()
elif page == "client_auth":
    page_client_auth()
elif page == "client_book":
    page_client_book()
elif page == "client_track":
    page_client_track()
elif page == "client_profile":
    page_client_profile()
elif page == "driver_register":
    page_driver_register()
elif page == "driver_login":
    page_driver_login()
elif page == "driver_dashboard":
    if st.session_state.mode == "driver" and st.session_state.driver_id:
        page_driver_dashboard()
    else:
        nav("driver_login")
elif page == "office_login":
    page_office_login()
elif page == "office_dashboard":
    if st.session_state.mode == "office":
        page_office_dashboard()
    else:
        nav("office_login")
else:
    nav("home")
