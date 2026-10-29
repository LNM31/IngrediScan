import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { router, useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Linking, StyleSheet, Text, View } from "react-native";

import { isValidEan13 } from "@/barcode/ean13";
import { strings } from "@/strings";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [invalidCode, setInvalidCode] = useState<string | null>(null);

  // onBarcodeScanned fires several times per second while the code is in frame.
  // The ref blocks every call after the first one, before React re-renders.
  const handled = useRef(false);
  const askedForPermission = useRef(false);

  // Coming back to this screen (Back from product / manual) starts a fresh scan.
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
      setInvalidCode(null);
    }, []),
  );

  // Ask once, automatically. After that the user decides with the buttons,
  // so a refusal never turns into a loop of system prompts.
  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !askedForPermission.current
    ) {
      askedForPermission.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;

    if (isValidEan13(data)) {
      router.push({ pathname: "/product/[barcode]", params: { barcode: data } });
    } else {
      setInvalidCode(data);
    }
  };

  const typeManually = () => router.push("/manual");

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text>{strings.cameraPermission.loading}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {strings.cameraPermission.explanation}
        </Text>
        {permission.canAskAgain ? (
          <Button
            title={strings.cameraPermission.allow}
            onPress={requestPermission}
          />
        ) : (
          <Button
            title={strings.cameraPermission.openSettings}
            onPress={() => Linking.openSettings()}
          />
        )}
        <Button title={strings.common.typeCodeManually} onPress={typeManually} />
      </View>
    );
  }

  if (invalidCode !== null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{strings.scan.invalidCode(invalidCode)}</Text>
        <Button
          title={strings.scan.retry}
          onPress={() => {
            handled.current = false;
            setInvalidCode(null);
          }}
        />
        <Button title={strings.common.typeCodeManually} onPress={typeManually} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* The stack keeps this screen mounted under the product screen;
          the camera runs only while it is visible. */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["ean13"] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}
      <Text style={styles.hint}>{strings.scan.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  message: {
    textAlign: "center",
    fontSize: 16,
  },
  hint: {
    margin: 24,
    padding: 12,
    textAlign: "center",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
  },
});
