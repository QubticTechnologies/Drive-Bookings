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
<br><span style="font-size:12px;color:#6b9aa2;letter-spacing:0.3px;">Go Further<span style="color:#FFC72C;">.</span></span>
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
  Go Further<span style="color:#FFC72C;">.</span>
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


def _location_picker(key_prefix: str, label: str, allow_gps: bool = True):
    """
    Interactive location picker — tabs for GPS · Search · Landmark · Paste.
    Returns (lat, lng, label_string).
    """
    lat = st.session_state.get(f"{key_prefix}_lat")
    lng = st.session_state.get(f"{key_prefix}_lng")
    lbl = st.session_state.get(f"{key_prefix}_label", "")

    # ── If a location is already set, show it with a clear button ────────────
    if lat and lbl:
        sel_col, clr_col = st.columns([6, 1])
        sel_col.success(f"✅ **{lbl}**  \n`{lat:.5f}, {lng:.5f}`")
        if clr_col.button("✕ Clear", key=f"{key_prefix}_clear", use_container_width=True):
            st.session_state[f"{key_prefix}_lat"] = None
            st.session_state[f"{key_prefix}_lng"] = None
            st.session_state[f"{key_prefix}_label"] = ""
            st.session_state[f"{key_prefix}_search_results"] = []
            st.rerun()
        return lat, lng, lbl

    st.caption(label)

    # ── Build tabs ────────────────────────────────────────────────────────────
    tab_labels = []
    if allow_gps:
        tab_labels.append("📍 My Location")
    tab_labels += ["🔍 Search", "🏛️ Landmark", "📋 Paste Link"]
    tabs = st.tabs(tab_labels)
    idx = 0

    # ── GPS tab ───────────────────────────────────────────────────────────────
    if allow_gps:
        with tabs[idx]:
            st.caption("We'll use your browser's GPS to find you automatically.")
            geo = get_geolocation()
            if geo and geo.get("coords"):
                new_lat = round(geo["coords"]["latitude"], 6)
                new_lng = round(geo["coords"]["longitude"], 6)
                acc = geo["coords"].get("accuracy", 0)
                if (new_lat, new_lng) != (lat, lng):
                    with st.spinner("Identifying your address…"):
                        address = db.reverse_geocode(new_lat, new_lng)
                    st.session_state[f"{key_prefix}_lat"] = new_lat
                    st.session_state[f"{key_prefix}_lng"] = new_lng
                    st.session_state[f"{key_prefix}_label"] = address
                    st.rerun()
                if lat:
                    st.success(f"📍 **{lbl}**  *(±{acc:.0f} m accuracy)*")
            else:
                st.info("🔐 Click **Allow** when your browser asks for location access.")
                st.caption("Works on HTTPS (deployed) and localhost. If blocked, try the Search or Paste tab.")
        idx += 1

    # ── Search tab ────────────────────────────────────────────────────────────
    with tabs[idx]:
        st.caption("Type any address, area, or business name in Nassau or the Bahamas.")
        col_q, col_btn = st.columns([5, 1])
        query = col_q.text_input(
            "Address search", label_visibility="collapsed",
            placeholder="e.g. Atlantis Resort, Fish Fry, Carmichael Road…",
            key=f"{key_prefix}_search_q")
        go = col_btn.button("Go →", key=f"{key_prefix}_search_btn", use_container_width=True)

        if go and query.strip():
            with st.spinner("Searching…"):
                results = db.geocode_address(query.strip())
            st.session_state[f"{key_prefix}_search_results"] = results

        results = st.session_state.get(f"{key_prefix}_search_results", [])
        if results:
            st.caption(f"{len(results)} result(s) — tap to select:")
            for i, r in enumerate(results):
                name = r["display_name"].split(",")[0].strip()
                hint = ", ".join(r["display_name"].split(",")[1:3]).strip()
                if st.button(f"📌 **{name}**  \n{hint}", key=f"{key_prefix}_res_{i}",
                             use_container_width=True):
                    st.session_state[f"{key_prefix}_lat"] = round(float(r["lat"]), 6)
                    st.session_state[f"{key_prefix}_lng"] = round(float(r["lon"]), 6)
                    st.session_state[f"{key_prefix}_label"] = name
                    st.session_state[f"{key_prefix}_search_results"] = []
                    st.rerun()
        elif go:
            st.warning("No results found. Try a broader term, e.g. 'Airport' or 'Cable Beach'.")
    idx += 1

    # ── Landmark tab ──────────────────────────────────────────────────────────
    with tabs[idx]:
        st.caption("Choose a well-known spot in Nassau from the list below.")
        place_names = [n for n in _all_place_names() if not n.startswith("──")]
        default_idx = place_names.index(lbl) if lbl in place_names else 0
        chosen = st.selectbox("Select landmark:", place_names, index=default_idx,
                              key=f"{key_prefix}_landmark_sel")
        plat, plng = _get_place_coords(chosen)
        st.caption(f"{plat:.5f}, {plng:.5f}")
        if st.button("✓ Use this landmark", key=f"{key_prefix}_landmark_btn",
                     type="primary", use_container_width=True):
            st.session_state[f"{key_prefix}_lat"] = plat
            st.session_state[f"{key_prefix}_lng"] = plng
            st.session_state[f"{key_prefix}_label"] = chosen
            st.rerun()
    idx += 1

    # ── Paste tab ─────────────────────────────────────────────────────────────
    with tabs[idx]:
        st.caption("Paste a Google Maps / Apple Maps link, WhatsApp location, or plain coordinates.")
        paste = st.text_area(
            "Paste here", label_visibility="collapsed",
            placeholder="25.0872, -77.3149\n— or —\nhttps://maps.google.com/...",
            key=f"{key_prefix}_paste_text", height=90)
        if paste.strip():
            plat, plng = db.parse_location_input(paste.strip())
            if plat and plng:
                st.caption(f"Parsed coords: {plat:.5f}, {plng:.5f}")
                if st.button("✓ Confirm this location", key=f"{key_prefix}_paste_btn",
                             type="primary", use_container_width=True):
                    with st.spinner("Identifying address…"):
                        address = db.reverse_geocode(plat, plng)
                    st.session_state[f"{key_prefix}_lat"] = plat
                    st.session_state[f"{key_prefix}_lng"] = plng
                    st.session_state[f"{key_prefix}_label"] = address
                    st.rerun()
            else:
                st.error("❌ Could not read location. Try format: `25.0800, -77.3420`")
        else:
            st.markdown(
                "**Accepted formats:**\n"
                "- Coordinates: `25.0872, -77.3149`\n"
                "- Google Maps link *(Share → Copy link)*\n"
                "- Apple Maps link\n"
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
                st.metric("🗺 Road Distance", f"{dist:.1f} km")
                st.metric("⏱ Est. Drive", f"{ri['duration_min']:.0f} min")
                st.metric("💵 Est. Fare", db.fmt_usd(fare))
                st.caption("Via OSRM road routing · Final fare at drop-off")
            else:
                dist = db.haversine(p_lat, p_lng, d_lat, d_lng)
                fare = db.calc_fare(dist)
                st.metric("📏 Distance", f"{dist:.1f} km")
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
            st.success(f"Ride requested! {db.fmt_usd(ride['estimated_fare'])} · {ride['distance_km']:.1f} km")
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
        st.metric("Distance", f"{ride['distance_km']:.1f} km")
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
def page_office_dashboard():
    if st.session_state.mode != "office":
        st.error("Access denied.")
        nav("office_login")
        return

    STATUS_EMOJI = {"available": "🟢", "busy": "🟡", "offline": "⚫"}

    # ── initialise session keys ────────────────────────────────────────────────
    if "completed_report" not in st.session_state:
        st.session_state.completed_report = None

    st.markdown("## 📡 Main Office — Dispatch Dashboard")

    drivers   = db.get_all_drivers()
    all_rides = db.get_all_rides()
    pending   = [r for r in all_rides if r["status"] == "pending"]
    active    = [r for r in all_rides if r["status"] in ("accepted", "in_progress")]
    scheduled = [r for r in all_rides if r["status"] == "scheduled"]
    available_drivers = [d for d in drivers if d["status"] == "available"]

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Drivers",    len(drivers))
    c2.metric("Available",        len(available_drivers))
    c3.metric("Pending Rides",    len(pending))
    c4.metric("Active Rides",     len(active))
    c5.metric("📅 Scheduled",     len(scheduled))

    st.divider()

    # ── completed ride report flash ────────────────────────────────────────────
    if st.session_state.completed_report:
        rpt = st.session_state.completed_report
        st.success(
            f"✅ **Ride Completed!**  \n"
            f"🚗 Driver **{rpt['driver']}** delivered **{rpt['client']}**  \n"
            f"📍 {rpt['pickup']} → {rpt['dropoff']}  \n"
            f"💰 Fare collected: **{rpt['fare']}** · {rpt['distance']} km · {rpt['duration']}  \n"
            f"🟢 **{rpt['driver']} is now available again.**"
        )
        if st.button("Dismiss", key="dismiss_report"):
            st.session_state.completed_report = None
            st.rerun()
        st.divider()

    map_col, panel_col = st.columns([3, 2])

    # ── MAP ───────────────────────────────────────────────────────────────────
    with map_col:
        st.markdown("#### 🗺 Live Driver Map")

        m = folium.Map(location=NASSAU_CENTER, zoom_start=13, tiles="CartoDB dark_matter")

        # build driver id → location lookup
        driver_loc: dict[int, tuple[float, float]] = {}
        for d in drivers:
            lat = float(d["last_lat"])  if d["last_lat"]  else (25.048 + (d["id"] * 0.003) % 0.12 - 0.06)
            lng = float(d["last_lng"]) if d["last_lng"] else (-77.355 + (d["id"] * 0.007) % 0.20 - 0.10)
            driver_loc[d["id"]] = (lat, lng)

        # draw active ride routes on the map
        for ride in active:
            if not (ride.get("pickup_lat") and ride.get("dropoff_lat")):
                continue
            p_lat, p_lng = float(ride["pickup_lat"]),  float(ride["pickup_lng"])
            d_lat, d_lng = float(ride["dropoff_lat"]), float(ride["dropoff_lng"])

            # dashed route line
            folium.PolyLine(
                [[p_lat, p_lng], [d_lat, d_lng]],
                color="#00C2D4", weight=3, opacity=0.7,
                dash_array="8 6",
                tooltip=f"{ride['pickup_location']} → {ride['dropoff_location']}",
            ).add_to(m)

            # pickup marker (green flag)
            folium.Marker(
                location=[p_lat, p_lng],
                icon=folium.DivIcon(html=(
                    '<div style="font-size:18px;line-height:1">📍</div>'
                ), icon_size=(22, 22), icon_anchor=(11, 22)),
                tooltip=f"Pickup: {ride['pickup_location']}",
            ).add_to(m)

            # dropoff marker (checkered flag)
            folium.Marker(
                location=[d_lat, d_lng],
                icon=folium.DivIcon(html=(
                    '<div style="font-size:18px;line-height:1">🏁</div>'
                ), icon_size=(22, 22), icon_anchor=(11, 22)),
                tooltip=f"Dropoff: {ride['dropoff_location']}",
            ).add_to(m)

            # line from driver's current position to pickup (if in_progress → to dropoff)
            if ride["driver_id"] and ride["driver_id"] in driver_loc:
                drv_lat, drv_lng = driver_loc[ride["driver_id"]]
                target = (d_lat, d_lng) if ride["status"] == "in_progress" else (p_lat, p_lng)
                folium.PolyLine(
                    [[drv_lat, drv_lng], list(target)],
                    color="#FFC72C", weight=2, opacity=0.6,
                    dash_array="4 4",
                ).add_to(m)

        # driver markers
        for d in drivers:
            lat, lng = driver_loc[d["id"]]
            updated = ""
            if d["last_location_updated_at"]:
                updated = f"<br><small>Updated: {d['last_location_updated_at'].strftime('%H:%M:%S')}</small>"
            popup_html = (
                f"<b>{d['name']}</b><br>"
                f"{d['vehicle_plate']} · {d['vehicle_color']} {d['vehicle_make']}<br>"
                f"<b>{STATUS_EMOJI.get(d['status'], '')} {d['status'].capitalize()}</b>"
                f"{updated}"
            )
            folium.CircleMarker(
                location=[lat, lng],
                radius=10 if d["status"] == "available" else 8,
                color="#000", weight=2, fill=True,
                fill_color={"available": "#10b981", "busy": "#f59e0b", "offline": "#6b7280"}.get(d["status"], "#6b7280"),
                fill_opacity=1.0,
                tooltip=folium.Tooltip(popup_html, sticky=True),
            ).add_to(m)

        st_folium(m, height=460, use_container_width=True)

        st.markdown("#### 🚗 Fleet")
        if not drivers:
            st.caption("No drivers registered yet.")
        else:
            for d in drivers:
                e = STATUS_EMOJI.get(d["status"], "⚫")
                st.markdown(
                    f"{e} **{d['name']}** — {d['vehicle_plate']} · "
                    f"{d['vehicle_make']} {d['vehicle_model']} "
                    f"· ⭐ {float(d['rating']):.1f} · {d['total_rides']} rides"
                )

    # ── PANEL ─────────────────────────────────────────────────────────────────
    with panel_col:
        st.markdown("#### 📅 Scheduled Rides")
        if not scheduled:
            st.caption("No upcoming scheduled rides.")
        else:
            for ride in sorted(scheduled, key=lambda r: r.get("scheduled_at") or datetime.max):
                sched = ride.get("scheduled_at")
                with st.container(border=True):
                    if sched:
                        delta = sched - datetime.utcnow()
                        hours = int(delta.total_seconds() // 3600)
                        mins  = int((delta.total_seconds() % 3600) // 60)
                        when  = sched.strftime("%b %d · %I:%M %p")
                        countdown = f"⏱ {hours}h {mins}m away" if delta.total_seconds() > 0 else "⚠️ Overdue"
                        st.markdown(f"**{when}** &nbsp; {countdown}")
                    st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                    st.caption(f"📍 {ride['pickup_location']}")
                    st.caption(f"🏁 {ride['dropoff_location']}")
                    st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}** · {ride['distance_km']:.1f} km")
                    if available_drivers:
                        driver_options = {f"{d['name']} — {d['vehicle_plate']}": d["id"] for d in available_drivers}
                        chosen_label = st.selectbox(
                            "Assign driver", list(driver_options.keys()), key=f"sched_sel_{ride['id']}")
                        if st.button("Confirm & Dispatch →", key=f"sched_dispatch_{ride['id']}",
                                     type="primary", use_container_width=True):
                            chosen_id = driver_options[chosen_label]
                            db.update_ride_status(ride["id"], "accepted", chosen_id)
                            st.success(f"Scheduled ride dispatched to {chosen_label.split(' — ')[0]}!")
                            st.rerun()
                    else:
                        st.warning("No available drivers right now.")

        st.markdown("#### ⏳ Pending Bookings")

        if not pending:
            st.success("No pending bookings right now.")
        else:
            for ride in pending:
                with st.container(border=True):
                    created  = ride["created_at"]
                    time_str = created.strftime("%H:%M") if isinstance(created, datetime) else ""
                    st.markdown(f"**{db.fmt_usd(ride['estimated_fare'])}** · {ride['distance_km']:.1f} km · {time_str}")
                    st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                    st.caption(f"📍 {ride['pickup_location']}")
                    st.caption(f"🏁 {ride['dropoff_location']}")

                    if available_drivers:
                        driver_options = {f"{d['name']} — {d['vehicle_plate']}": d["id"] for d in available_drivers}
                        chosen_label = st.selectbox(
                            "Assign driver", list(driver_options.keys()), key=f"sel_{ride['id']}")
                        if st.button("Dispatch →", key=f"dispatch_{ride['id']}", type="primary",
                                     use_container_width=True):
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
                    if ride["status"] == "in_progress":
                        st.markdown("🚀 **IN PROGRESS**")
                    else:
                        st.markdown("🚗 **ACCEPTED — awaiting start**")

                    st.markdown(
                        f"**{db.fmt_usd(ride['estimated_fare'])}** · "
                        f"{ride['distance_km']:.1f} km"
                    )
                    st.caption(f"👤 {ride['client_name']} · {ride['client_phone']}")
                    st.caption(f"📍 {ride['pickup_location']}")
                    st.caption(f"🏁 {ride['dropoff_location']}")
                    if ride["driver_name"]:
                        st.caption(f"🚗 {ride['driver_name']} · {ride['driver_plate']}")

                    # admin can advance: accepted → in_progress, or in_progress → completed
                    if ride["status"] == "accepted":
                        if st.button("▶ Mark In Progress", key=f"start_{ride['id']}",
                                     use_container_width=True):
                            db.update_ride_status(ride["id"], "in_progress")
                            st.rerun()

                    elif ride["status"] == "in_progress":
                        if st.button("✅ Complete Ride", key=f"complete_{ride['id']}",
                                     type="primary", use_container_width=True):
                            # duration
                            started = ride.get("started_at")
                            if started:
                                mins = int((datetime.utcnow() - started).total_seconds() // 60)
                                dur  = f"{mins} min"
                            else:
                                dur = "—"
                            completed_ride = db.update_ride_status(ride["id"], "completed")
                            st.session_state.completed_report = {
                                "driver":   ride["driver_name"] or "Driver",
                                "client":   ride["client_name"],
                                "pickup":   ride["pickup_location"],
                                "dropoff":  ride["dropoff_location"],
                                "fare":     db.fmt_usd(ride["estimated_fare"]),
                                "distance": f"{ride['distance_km']:.1f}",
                                "duration": dur,
                            }
                            st.rerun()

    time.sleep(6)
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
