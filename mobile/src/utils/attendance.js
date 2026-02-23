const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const rgbToHex = (r, g, b) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const interpolateColor = (from, to, ratio) => {
  const safeRatio = clamp(ratio, 0, 1);
  return [
    from[0] + (to[0] - from[0]) * safeRatio,
    from[1] + (to[1] - from[1]) * safeRatio,
    from[2] + (to[2] - from[2]) * safeRatio,
  ];
};

export const attendanceColor = (percentage) => {
  const p = clamp(Number(percentage) || 0, 0, 100);
  const stops = [
    { p: 0, c: [255, 56, 96] },
    { p: 50, c: [255, 128, 66] },
    { p: 75, c: [255, 216, 71] },
    { p: 90, c: [78, 222, 128] },
    { p: 100, c: [56, 245, 190] },
  ];

  for (let index = 0; index < stops.length - 1; index += 1) {
    const left = stops[index];
    const right = stops[index + 1];
    if (p >= left.p && p <= right.p) {
      const ratio = (p - left.p) / (right.p - left.p || 1);
      const mixed = interpolateColor(left.c, right.c, ratio);
      return rgbToHex(mixed[0], mixed[1], mixed[2]);
    }
  }

  return "#38f5be";
};

export const riskLevel = (attendancePercentage, requiredAttendance) => {
  if (attendancePercentage < requiredAttendance) {
    return "critical";
  }
  if (attendancePercentage < requiredAttendance + 7) {
    return "warning";
  }
  return "safe";
};

export const calculateAttendanceMetrics = (
  attendedClasses,
  totalClasses,
  requiredAttendance = 75
) => {
  const attended = Number(attendedClasses) || 0;
  const total = Number(totalClasses) || 0;
  const required = clamp(Number(requiredAttendance) || 75, 50, 100);
  const requiredRatio = required / 100;

  const attendancePercentage =
    total === 0 ? 100 : Number(((attended / total) * 100).toFixed(2));

  const maxMissBeforeThreshold =
    total === 0
      ? 0
      : Math.max(0, Math.floor(attended / requiredRatio - total));

  const classesNeededToRecover =
    total > 0 && attendancePercentage < required
      ? Math.max(
          0,
          Math.ceil((requiredRatio * total - attended) / (1 - requiredRatio || 1))
        )
      : 0;

  return {
    attendedClasses: attended,
    totalClasses: total,
    attendancePercentage,
    requiredAttendance: required,
    maxMissBeforeThreshold,
    classesNeededToRecover,
    risk: riskLevel(attendancePercentage, required),
    tone: attendanceColor(attendancePercentage),
  };
};

export const buildSubjectMetrics = (subjects, attendanceRecords) =>
  subjects.map((subject) => {
    const records = attendanceRecords.filter(
      (entry) => entry.subjectId === subject.id
    );
    const totalClasses = records.length;
    const attendedClasses = records.filter(
      (entry) => entry.status === "present"
    ).length;
    const metrics = calculateAttendanceMetrics(
      attendedClasses,
      totalClasses,
      subject.requiredAttendance
    );

    return {
      ...subject,
      metrics,
      records,
    };
  });

export const buildOverview = (subjectWithMetrics) => {
  const totals = subjectWithMetrics.reduce(
    (acc, subject) => {
      acc.attended += subject.metrics.attendedClasses;
      acc.total += subject.metrics.totalClasses;
      return acc;
    },
    { attended: 0, total: 0 }
  );

  const overallAttendance =
    totals.total === 0
      ? 100
      : Number(((totals.attended / totals.total) * 100).toFixed(2));

  return {
    totalSubjects: subjectWithMetrics.length,
    atRiskSubjects: subjectWithMetrics.filter(
      (subject) => subject.metrics.risk !== "safe"
    ).length,
    overallAttendance,
    overallTone: attendanceColor(overallAttendance),
  };
};

