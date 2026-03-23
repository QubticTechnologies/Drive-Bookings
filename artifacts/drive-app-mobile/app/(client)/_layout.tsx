import { Stack } from "expo-router";
import COLORS from "@/constants/colors";

export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
      <Stack.Screen name="book" />
      <Stack.Screen name="track/[id]" />
    </Stack>
  );
}
