const AttendanceEntry = require("../models/AttendanceEntry");
const Subject = require("../models/Subject");
const { getStartOfDayUTC } = require("../utils/attendance");
const {
  getAttendanceStatsMap,
  withSubjectMetrics,
} = require("../services/subjectMetrics");

const listAttendanceEntries = async (req, res) => {
  const query = { user: req.userId };

  if (req.query.subjectId) {
    query.subject = req.query.subjectId;
  }

  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) {
      query.date.$gte = getStartOfDayUTC(req.query.from);
    }
    if (req.query.to) {
      query.date.$lte = getStartOfDayUTC(req.query.to);
    }
  }

  const entries = await AttendanceEntry.find(query)
    .populate("subject", "name requiredAttendance")
    .sort({ date: -1, createdAt: -1 });

  return res.json({ entries });
};

const upsertAttendanceEntry = async (req, res) => {
  const { subjectId, date, status } = req.body;
  const lectureName = (req.body.lectureName || "L1").trim();
  const normalizedDate = getStartOfDayUTC(date);

  const subject = await Subject.findOne({
    _id: subjectId,
    user: req.userId,
  });

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  const entry = await AttendanceEntry.findOneAndUpdate(
    {
      user: req.userId,
      subject: subjectId,
      date: normalizedDate,
      lectureName,
    },
    {
      user: req.userId,
      subject: subjectId,
      date: normalizedDate,
      lectureName,
      status,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("subject", "name requiredAttendance");

  const statsMap = await getAttendanceStatsMap(req.userId, [subject._id]);
  const [subjectWithMetrics] = withSubjectMetrics([subject], statsMap);

  return res.status(201).json({
    entry,
    subject: subjectWithMetrics,
  });
};

const deleteAttendanceEntry = async (req, res) => {
  const deleted = await AttendanceEntry.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });

  if (!deleted) {
    return res.status(404).json({ message: "Attendance entry not found" });
  }

  return res.json({ message: "Attendance entry deleted" });
};

module.exports = {
  listAttendanceEntries,
  upsertAttendanceEntry,
  deleteAttendanceEntry,
};
