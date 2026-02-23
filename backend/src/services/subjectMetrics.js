const AttendanceEntry = require("../models/AttendanceEntry");
const { calculateAttendanceMetrics } = require("../utils/attendance");

const getAttendanceStatsMap = async (userId, subjectIds = []) => {
  const match = { user: userId };
  if (subjectIds.length > 0) {
    match.subject = { $in: subjectIds };
  }

  const grouped = await AttendanceEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$subject",
        totalClasses: { $sum: 1 },
        attendedClasses: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0],
          },
        },
      },
    },
  ]);

  return new Map(grouped.map((item) => [String(item._id), item]));
};

const withSubjectMetrics = (subjects, statsMap) =>
  subjects.map((subject) => {
    const stats = statsMap.get(String(subject._id));
    const attendedClasses = stats?.attendedClasses ?? 0;
    const totalClasses = stats?.totalClasses ?? 0;
    const metrics = calculateAttendanceMetrics(
      attendedClasses,
      totalClasses,
      subject.requiredAttendance
    );

    return {
      ...subject.toObject(),
      metrics,
    };
  });

module.exports = {
  getAttendanceStatsMap,
  withSubjectMetrics,
};

