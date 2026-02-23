const Subject = require("../models/Subject");
const AttendanceEntry = require("../models/AttendanceEntry");
const {
  getAttendanceStatsMap,
  withSubjectMetrics,
} = require("../services/subjectMetrics");

const getSubjects = async (req, res) => {
  const subjects = await Subject.find({ user: req.userId }).sort({
    createdAt: -1,
  });
  const subjectIds = subjects.map((subject) => subject._id);
  const statsMap = await getAttendanceStatsMap(req.userId, subjectIds);
  const subjectsWithMetrics = withSubjectMetrics(subjects, statsMap);

  return res.json({ subjects: subjectsWithMetrics });
};

const createSubject = async (req, res) => {
  const { name, requiredAttendance = 75 } = req.body;

  const subject = await Subject.create({
    user: req.userId,
    name,
    requiredAttendance,
  });

  return res.status(201).json({
    subject: {
      ...subject.toObject(),
      metrics: {
        attendedClasses: 0,
        totalClasses: 0,
        attendancePercentage: 100,
        requiredAttendance: subject.requiredAttendance,
        maxMissBeforeThreshold: 0,
        classesNeededToRecover: 0,
        risk: "safe",
      },
    },
  });
};

const getSubjectById = async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.id,
    user: req.userId,
  });

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  const statsMap = await getAttendanceStatsMap(req.userId, [subject._id]);
  const [subjectWithMetrics] = withSubjectMetrics([subject], statsMap);

  return res.json({ subject: subjectWithMetrics });
};

const updateSubject = async (req, res) => {
  const { name, requiredAttendance } = req.body;
  const subject = await Subject.findOne({
    _id: req.params.id,
    user: req.userId,
  });

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  if (name !== undefined) {
    subject.name = name;
  }

  if (requiredAttendance !== undefined) {
    subject.requiredAttendance = requiredAttendance;
  }

  await subject.save();

  const statsMap = await getAttendanceStatsMap(req.userId, [subject._id]);
  const [subjectWithMetrics] = withSubjectMetrics([subject], statsMap);

  return res.json({ subject: subjectWithMetrics });
};

const deleteSubject = async (req, res) => {
  const subject = await Subject.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  await AttendanceEntry.deleteMany({ user: req.userId, subject: subject._id });

  return res.json({ message: "Subject deleted" });
};

module.exports = {
  getSubjects,
  createSubject,
  getSubjectById,
  updateSubject,
  deleteSubject,
};

