import { Stack } from "expo-router";
import COLORS from "@/constants/colors";

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
