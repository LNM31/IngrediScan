import { router } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { isValidEan13 } from "@/barcode/ean13";
import { strings } from "@/strings";

const EAN13_LENGTH = 13;

export default function Manual() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onChangeText = (text: string) => {
    // Cleanup belongs to the UI: keep only digits (pasted text may have spaces).
    setCode(text.replace(/[^0-9]/g, "").slice(0, EAN13_LENGTH));
    setError(null);
  };

  const onSubmit = () => {
    if (code.length !== EAN13_LENGTH) {
      setError(strings.manual.wrongLength(code.length));
      return;
    }
    if (!isValidEan13(code)) {
      setError(strings.manual.wrongCheckDigit);
      return;
    }
    router.push({ pathname: "/product/[barcode]", params: { barcode: code } });
  };

  return (
    <View style={styles.container}>
      <Text>{strings.manual.label}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={strings.manual.placeholder}
        keyboardType="number-pad"
        maxLength={EAN13_LENGTH}
        autoFocus
      />
      {error !== null && <Text style={styles.error}>{error}</Text>}
      <Button title={strings.manual.submit} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    letterSpacing: 2,
  },
  error: {
    color: "#b00020",
  },
});
