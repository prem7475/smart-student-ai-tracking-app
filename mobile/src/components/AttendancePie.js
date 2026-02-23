import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Stop } from "react-native-svg";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const AttendancePie = ({
  percentage,
  size = 146,
  strokeWidth = 14,
  primaryColor = "#39f0c8",
  secondaryColor = "#2a7dff",
  label = "Attendance",
}) => {
  const safePercentage = clamp(Number(percentage) || 0, 0, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const attendedLength = circumference * (safePercentage / 100);
  const gradientId = useMemo(
    () => `attendance-gradient-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={secondaryColor} />
            <Stop offset="100%" stopColor={primaryColor} />
          </LinearGradient>
        </Defs>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(120, 136, 186, 0.18)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${attendedLength} ${Math.max(
              0,
              circumference - attendedLength
            )}`}
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={styles.percentageText}>{safePercentage.toFixed(1)}%</Text>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    color: "#d9edff",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  labelText: {
    color: "rgba(194, 215, 255, 0.8)",
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
  },
});

export default AttendancePie;

