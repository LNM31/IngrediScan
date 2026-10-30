import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { NormalizedProduct } from "@/adapters/types";
import { adaptOffProduct } from "@/adapters/off";
import { fetchOffProduct } from "@/api/openFoodFacts";
import { isValidEan13 } from "@/barcode/ean13";
import { strings } from "@/strings";

type LoadState =
  | { kind: "loading" }
  | { kind: "found"; product: NormalizedProduct }
  | { kind: "notFound" }
  | { kind: "error" }; // network or corrupt data: same message for the user

export default function Product() {
  // From a deep link the param can be anything (or an array), so check it here too.
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const valid = typeof barcode === "string" && isValidEan13(barcode);

  if (!valid) {
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

  // key: a different barcode remounts the lookup, so it starts again from "loading".
  return <ProductLookup key={barcode} barcode={barcode} />;
}

function ProductLookup({ barcode }: { barcode: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    // Ignore a late answer if the screen was left before it arrived.
    let ignore = false;

    fetchOffProduct(barcode).then((result) => {
      if (ignore) return;
      if (result.kind === "found") {
        setState({ kind: "found", product: adaptOffProduct(result.raw) });
      } else if (result.kind === "notFound") {
        setState({ kind: "notFound" });
      } else {
        setState({ kind: "error" });
      }
    });

    return () => {
      ignore = true;
    };
  }, [barcode]);

  // Back to the scan screen if it is in the stack (it restarts scanning on
  // focus); coming from manual entry, the product screen is replaced by it.
  const scanAnother = () => router.dismissTo("/scan");

  return (
    <View style={styles.container}>
      {state.kind === "loading" && (
        <>
          <ActivityIndicator size="large" />
          <Text>{strings.product.loading}</Text>
        </>
      )}

      {state.kind === "found" && <ProductInfo product={state.product} />}

      {state.kind === "notFound" && (
        <Text style={styles.message}>{strings.product.notFound}</Text>
      )}

      {state.kind === "error" && (
        <Text style={[styles.message, styles.error]}>
          {strings.product.loadError}
        </Text>
      )}

      <Text style={styles.barcode} selectable>
        {strings.product.barcodeLabel}: {barcode}
      </Text>

      {state.kind !== "loading" && (
        <Button title={strings.product.scanAnother} onPress={scanAnother} />
      )}
    </View>
  );
}

function ProductInfo({ product }: { product: NormalizedProduct }) {
  const details = [product.brand, product.quantity]
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <>
      {product.imageUrl !== null && (
        <Image
          source={product.imageUrl}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel={strings.product.imageLabel}
        />
      )}
      <Text style={styles.name}>{product.name ?? strings.product.noName}</Text>
      {details !== "" && <Text style={styles.details}>{details}</Text>}
    </>
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
  image: {
    width: 200,
    height: 200,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  details: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    textAlign: "center",
  },
  barcode: {
    fontVariant: ["tabular-nums"],
    color: "#555",
  },
  error: {
    color: "#b00020",
    textAlign: "center",
  },
});
