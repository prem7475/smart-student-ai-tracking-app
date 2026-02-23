const express = require("express");
const { body, param, query } = require("express-validator");
const auth = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const {
  listAttendanceEntries,
  upsertAttendanceEntry,
  deleteAttendanceEntry,
} = require("../controllers/attendanceController");

const router = express.Router();

router.use(auth);

router.get(
  "/",
  [
    query("subjectId")
      .optional()
      .isMongoId()
      .withMessage("subjectId must be a valid id"),
    query("from").optional().isISO8601().withMessage("from must be YYYY-MM-DD"),
    query("to").optional().isISO8601().withMessage("to must be YYYY-MM-DD"),
  ],
  validateRequest,
  listAttendanceEntries
);

router.post(
  "/",
  [
    body("subjectId").isMongoId().withMessage("subjectId is required"),
    body("date").isISO8601().withMessage("date must be YYYY-MM-DD"),
    body("status")
      .isIn(["present", "absent"])
      .withMessage("status must be present or absent"),
    body("lectureName")
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage("lectureName must be 1 to 50 characters"),
  ],
  validateRequest,
  upsertAttendanceEntry
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid attendance entry id")],
  validateRequest,
  deleteAttendanceEntry
);

module.exports = router;
