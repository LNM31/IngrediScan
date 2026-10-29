import { router } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

import { strings } from "@/strings";

export default function Home() {
  return (
    <View style={styles.container}>
      <Button
        title={strings.home.scanBarcode}
        onPress={() => router.push("/scan")}
      />
      <Button
        title={strings.home.typeCode}
        onPress={() => router.push("/manual")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
});
