const mongoose = require("mongoose");

const attendanceEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    lectureName: {
      type: String,
      trim: true,
      default: "L1",
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
  },
  { timestamps: true }
);

attendanceEntrySchema.index(
  { user: 1, subject: 1, date: 1, lectureName: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttendanceEntry", attendanceEntrySchema);
