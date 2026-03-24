import { Stack } from "expo-router";
import COLORS from "@/constants/colors";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      {/* index is the auth root — nothing to go back to, disable gesture */}
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="guest" />
    </Stack>
  );
}
