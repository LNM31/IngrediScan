import { Stack } from "expo-router";

import { strings } from "@/strings";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: strings.home.title }} />
      <Stack.Screen name="scan" options={{ title: strings.scan.title }} />
      <Stack.Screen name="manual" options={{ title: strings.manual.title }} />
      <Stack.Screen
        name="product/[barcode]"
        options={{ title: strings.product.title }}
      />
    </Stack>
  );
}
