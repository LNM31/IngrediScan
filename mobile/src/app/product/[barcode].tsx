import { router, useLocalSearchParams } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

import { isValidEan13 } from "@/barcode/ean13";
import { strings } from "@/strings";

export default function Product() {
  // From a deep link the param can be anything (or an array), so check it here too.
  const { barcode } = useLocalSearchParams<{ barcode: string }>();

  if (typeof barcode !== "string" || !isValidEan13(barcode)) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{strings.product.invalidBarcode}</Text>
        <Button
          title={strings.common.goHome}
          onPress={() => router.dismissTo("/")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>{strings.product.barcodeLabel}</Text>
      <Text style={styles.barcode} selectable>
        {barcode}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  barcode: {
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  error: {
    color: "#b00020",
    textAlign: "center",
  },
});
