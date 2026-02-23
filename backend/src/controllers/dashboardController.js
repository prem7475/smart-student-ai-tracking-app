const Subject = require("../models/Subject");
const {
  getAttendanceStatsMap,
  withSubjectMetrics,
} = require("../services/subjectMetrics");

const getOverview = async (req, res) => {
  const subjects = await Subject.find({ user: req.userId }).sort({
    createdAt: -1,
  });

  const subjectIds = subjects.map((subject) => subject._id);
  const statsMap = await getAttendanceStatsMap(req.userId, subjectIds);
  const subjectsWithMetrics = withSubjectMetrics(subjects, statsMap);

  const totalSubjects = subjectsWithMetrics.length;
  const atRiskSubjects = subjectsWithMetrics.filter(
    (subject) => subject.metrics.risk !== "safe"
  ).length;

  const totals = subjectsWithMetrics.reduce(
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

  return res.json({
    overview: {
      totalSubjects,
      atRiskSubjects,
      overallAttendance,
    },
    subjects: subjectsWithMetrics,
  });
};

module.exports = {
  getOverview,
};

