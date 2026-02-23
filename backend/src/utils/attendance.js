const clampToNonNegative = (value) => (value < 0 ? 0 : value);

const getStartOfDayUTC = (dateInput) => {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

const calculateAttendanceMetrics = (attended, total, requiredAttendance = 75) => {
  const requiredRatio = requiredAttendance / 100;
  const attendedClasses = Number(attended) || 0;
  const totalClasses = Number(total) || 0;

  const attendancePercentage =
    totalClasses === 0
      ? 100
      : Number(((attendedClasses / totalClasses) * 100).toFixed(2));

  const maxMissBeforeThreshold =
    totalClasses === 0
      ? 0
      : clampToNonNegative(
          Math.floor(attendedClasses / requiredRatio - totalClasses)
        );

  let classesNeededToRecover = 0;
  if (totalClasses > 0 && attendancePercentage < requiredAttendance) {
    classesNeededToRecover = clampToNonNegative(
      Math.ceil(
        (requiredRatio * totalClasses - attendedClasses) / (1 - requiredRatio)
      )
    );
  }

  let risk = "safe";
  if (attendancePercentage < requiredAttendance) {
    risk = "critical";
  } else if (maxMissBeforeThreshold <= 2) {
    risk = "warning";
  }

  return {
    attendedClasses,
    totalClasses,
    attendancePercentage,
    requiredAttendance,
    maxMissBeforeThreshold,
    classesNeededToRecover,
    risk,
  };
};

module.exports = {
  getStartOfDayUTC,
  calculateAttendanceMetrics,
};

