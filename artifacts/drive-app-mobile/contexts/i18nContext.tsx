import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Language = "en" | "es" | "fr";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇧🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

type Translations = typeof EN;

const EN = {
  // Welcome
  welcomeTitle: "Your Ride,\nYour Way",
  welcomeSubtitle: "Safe, transparent rides across Nassau. Trusted by tourists and locals.",
  selectLanguage: "Select your language",
  continueWithPhone: "Continue with Phone",
  continueWithGoogle: "Continue with Google",
  continueWithApple: "Continue with Apple",
  continueAsGuest: "Continue as Guest",
  guestNote: "No sign-up needed",
  signIn: "Sign In",
  // Phone
  phoneTitle: "Enter your number",
  phoneSubtitle: "We'll send a 6-digit code to verify your identity",
  phonePlaceholder: "+1 (242) 555-0100",
  sendCode: "Send Verification Code",
  sending: "Sending…",
  // OTP
  otpTitle: "Check your phone",
  otpSubtitle: "We sent a 6-digit code to",
  otpPlaceholder: "000000",
  verify: "Verify Code",
  verifying: "Verifying…",
  resendCode: "Resend Code",
  resendIn: "Resend in",
  seconds: "s",
  wrongNumber: "Wrong number?",
  change: "Change",
  // Guest
  guestTitle: "Quick Start",
  guestSubtitle: "Jump straight in — no account needed.\nYou can create one later.",
  yourName: "Your name (optional)",
  namePlaceholder: "e.g. Sarah Brown",
  continueNow: "Continue Now",
  // Common
  back: "Back",
  error: "Something went wrong. Please try again.",
  invalidPhone: "Please enter a valid phone number.",
  invalidCode: "Please enter the 6-digit code.",
  // Language names
  en: "English",
  es: "Spanish",
  fr: "French",
};

const ES: Translations = {
  welcomeTitle: "Tu Viaje,\na Tu Manera",
  welcomeSubtitle: "Viajes seguros y transparentes por Nassau. De confianza para turistas y locales.",
  selectLanguage: "Selecciona tu idioma",
  continueWithPhone: "Continuar con teléfono",
  continueWithGoogle: "Continuar con Google",
  continueWithApple: "Continuar con Apple",
  continueAsGuest: "Continuar como invitado",
  guestNote: "Sin registro necesario",
  signIn: "Iniciar sesión",
  phoneTitle: "Ingresa tu número",
  phoneSubtitle: "Te enviaremos un código de 6 dígitos para verificar tu identidad",
  phonePlaceholder: "+1 (242) 555-0100",
  sendCode: "Enviar código de verificación",
  sending: "Enviando…",
  otpTitle: "Revisa tu teléfono",
  otpSubtitle: "Enviamos un código de 6 dígitos a",
  otpPlaceholder: "000000",
  verify: "Verificar código",
  verifying: "Verificando…",
  resendCode: "Reenviar código",
  resendIn: "Reenviar en",
  seconds: "s",
  wrongNumber: "¿Número incorrecto?",
  change: "Cambiar",
  guestTitle: "Inicio rápido",
  guestSubtitle: "Empieza de inmediato — sin cuenta necesaria.\nPuedes crear una después.",
  yourName: "Tu nombre (opcional)",
  namePlaceholder: "Ej. Carlos o Turista",
  continueNow: "Continuar ahora",
  back: "Atrás",
  error: "Algo salió mal. Inténtalo de nuevo.",
  invalidPhone: "Ingresa un número de teléfono válido.",
  invalidCode: "Ingresa el código de 6 dígitos.",
  en: "Inglés",
  es: "Español",
  fr: "Francés",
};

const FR: Translations = {
  welcomeTitle: "Votre Trajet,\nÀ Votre Façon",
  welcomeSubtitle: "Des trajets sûrs et transparents à Nassau. La confiance des touristes et des locaux.",
  selectLanguage: "Choisissez votre langue",
  continueWithPhone: "Continuer avec le téléphone",
  continueWithGoogle: "Continuer avec Google",
  continueWithApple: "Continuer avec Apple",
  continueAsGuest: "Continuer en tant qu'invité",
  guestNote: "Sans inscription",
  signIn: "Se connecter",
  phoneTitle: "Entrez votre numéro",
  phoneSubtitle: "Nous vous enverrons un code à 6 chiffres pour vérifier votre identité",
  phonePlaceholder: "+1 (242) 555-0100",
  sendCode: "Envoyer le code",
  sending: "Envoi…",
  otpTitle: "Vérifiez votre téléphone",
  otpSubtitle: "Nous avons envoyé un code à 6 chiffres à",
  otpPlaceholder: "000000",
  verify: "Vérifier le code",
  verifying: "Vérification…",
  resendCode: "Renvoyer le code",
  resendIn: "Renvoyer dans",
  seconds: "s",
  wrongNumber: "Mauvais numéro ?",
  change: "Modifier",
  guestTitle: "Démarrage rapide",
  guestSubtitle: "Commencez tout de suite — sans compte requis.\nVous pouvez en créer un plus tard.",
  yourName: "Votre nom (facultatif)",
  namePlaceholder: "Ex. Pierre ou Touriste",
  continueNow: "Continuer maintenant",
  back: "Retour",
  error: "Une erreur s'est produite. Veuillez réessayer.",
  invalidPhone: "Veuillez entrer un numéro de téléphone valide.",
  invalidCode: "Veuillez entrer le code à 6 chiffres.",
  en: "Anglais",
  es: "Espagnol",
  fr: "Français",
};

const TRANSLATIONS: Record<Language, Translations> = { en: EN, es: ES, fr: FR };

interface I18nState {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nState>({ language: "en", t: EN, setLanguage: () => {} });

const LANG_KEY = "driveapp_language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((stored) => {
      if (stored && (stored === "en" || stored === "es" || stored === "fr")) {
        setLanguageState(stored as Language);
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  return (
    <I18nContext.Provider value={{ language, t: TRANSLATIONS[language], setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
