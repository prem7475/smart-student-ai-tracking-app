import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const GRID_LINES = Array.from({ length: 10 }, (_, index) => index);
const RADIATION_LINES = Array.from({ length: 7 }, (_, index) => index);

const CyberBackground = () => {
  const scanX = useRef(new Animated.Value(0)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const skullSpin = useRef(new Animated.Value(0)).current;
  const skullDriftX = useRef(new Animated.Value(0)).current;
  const skullDriftY = useRef(new Animated.Value(0)).current;
  const skullPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanX, {
            toValue: 1,
            duration: 7600,
            useNativeDriver: true,
          }),
          Animated.timing(scanX, {
            toValue: 0,
            duration: 7600,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanY, {
            toValue: 1,
            duration: 9200,
            useNativeDriver: true,
          }),
          Animated.timing(scanY, {
            toValue: 0,
            duration: 9200,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.timing(skullSpin, {
          toValue: 1,
          duration: 28000,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(skullDriftX, {
            toValue: 1,
            duration: 12000,
            useNativeDriver: true,
          }),
          Animated.timing(skullDriftX, {
            toValue: 0,
            duration: 12000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(skullDriftY, {
            toValue: 1,
            duration: 16000,
            useNativeDriver: true,
          }),
          Animated.timing(skullDriftY, {
            toValue: 0,
            duration: 16000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(skullPulse, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(skullPulse, {
            toValue: 0,
            duration: 2400,
            useNativeDriver: true,
          }),
        ])
      ),
    ];

    loops.forEach((anim) => anim.start());
    return () => loops.forEach((anim) => anim.stop());
  }, [scanX, scanY, skullDriftX, skullDriftY, skullPulse, skullSpin]);

  const scanTranslateX = scanX.interpolate({
    inputRange: [0, 1],
    outputRange: [-460, 460],
  });
  const scanTranslateY = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [-520, 520],
  });

  const skullRotate = skullSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const skullTilt = skullSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });
  const skullX = skullDriftX.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 55],
  });
  const skullY = skullDriftY.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 70],
  });
  const skullAuraScale = skullPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const skullAuraOpacity = skullPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.14, 0.35],
  });

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <LinearGradient
        colors={["#02030a", "#05091a", "#040b23", "#070a19", "#03040d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.grid}>
        {GRID_LINES.map((line) => (
          <View
            key={`grid_h_${line}`}
            style={[styles.gridLineHorizontal, { top: 50 + line * 56 }]}
          />
        ))}
        {GRID_LINES.map((line) => (
          <View
            key={`grid_v_${line}`}
            style={[styles.gridLineVertical, { left: 30 + line * 44 }]}
          />
        ))}
      </View>

      {RADIATION_LINES.map((line) => (
        <Animated.View
          key={`beam_x_${line}`}
          style={[
            styles.radiationBeam,
            {
              top: 70 + line * 82,
              opacity: 0.06 + line * 0.017,
              transform: [
                { translateX: scanTranslateX },
                { rotate: `${-6 + line * 2}deg` },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["transparent", "#2a7dff", "#00d4ff", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.beamGradient}
          />
        </Animated.View>
      ))}

      <Animated.View
        style={[
          styles.verticalBeam,
          {
            transform: [{ translateY: scanTranslateY }, { rotate: "8deg" }],
          },
        ]}
      >
        <LinearGradient
          colors={["transparent", "#00e5ff", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.verticalBeamGradient}
        />
      </Animated.View>

      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />

      <Animated.View
        style={[
          styles.skullOrbit,
          {
            transform: [
              { translateX: skullX },
              { translateY: skullY },
              { perspective: 900 },
              { rotateY: skullTilt },
              { rotate: skullRotate },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.skullAura,
            {
              transform: [{ scale: skullAuraScale }],
              opacity: skullAuraOpacity,
            },
          ]}
        />
        <View style={styles.skullHead}>
          <View style={styles.eyeRow}>
            <View style={styles.eyeSocket} />
            <View style={styles.eyeSocket} />
          </View>
          <View style={styles.nose} />
          <View style={styles.teethRow}>
            <View style={styles.tooth} />
            <View style={styles.tooth} />
            <View style={styles.tooth} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineHorizontal: {
    position: "absolute",
    width: "140%",
    left: "-20%",
    height: 1,
    backgroundColor: "rgba(89, 133, 255, 0.08)",
  },
  gridLineVertical: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 1,
    backgroundColor: "rgba(52, 217, 255, 0.06)",
  },
  radiationBeam: {
    position: "absolute",
    width: 320,
    height: 4,
    left: -220,
    borderRadius: 6,
  },
  beamGradient: {
    flex: 1,
  },
  verticalBeam: {
    position: "absolute",
    right: 70,
    width: 8,
    height: 320,
    opacity: 0.26,
  },
  verticalBeamGradient: {
    flex: 1,
    borderRadius: 12,
  },
  glowLarge: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    right: -140,
    top: -90,
    backgroundColor: "rgba(0, 136, 255, 0.1)",
  },
  glowSmall: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    left: -80,
    bottom: -70,
    backgroundColor: "rgba(0, 224, 255, 0.08)",
  },
  skullOrbit: {
    position: "absolute",
    right: 24,
    top: 120,
    width: 124,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
  },
  skullAura: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#18a9ff",
  },
  skullHead: {
    width: 78,
    height: 88,
    borderRadius: 26,
    backgroundColor: "rgba(216, 241, 255, 0.9)",
    borderWidth: 2,
    borderColor: "rgba(46, 179, 255, 0.45)",
    alignItems: "center",
    justifyContent: "space-evenly",
    shadowColor: "#00d4ff",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  eyeRow: {
    marginTop: 10,
    width: "76%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyeSocket: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#001826",
  },
  nose: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#001826",
  },
  teethRow: {
    width: "70%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tooth: {
    width: 9,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#f7fcff",
  },
});

export default CyberBackground;

