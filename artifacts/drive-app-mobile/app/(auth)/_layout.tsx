import { Stack, router } from "expo-router";
import React from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "expo-router";

import COLORS from "@/constants/colors";

// Tell expo-router that 'index' is always the initial route in this group.
// This prevents stale persisted navigation state from restoring a mid-flow screen
// with no valid back history, which would cause GO_BACK to be unhandled.
export const unstable_settings = {
  initialRouteName: "index",
};

export default function AuthLayout() {
  // Intercept Android hardware back button for the entire auth group.
  // When the back button fires on the auth index (nothing to go back to),
  // consume the event without dispatching GO_BACK.
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="guest" />
    </Stack>
  );
}
