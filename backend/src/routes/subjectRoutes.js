const express = require("express");
const { body, param } = require("express-validator");
const auth = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const {
  getSubjects,
  createSubject,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");

const router = express.Router();

router.use(auth);

router.get("/", getSubjects);

router.post(
  "/",
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage("Name must be between 2 and 120 characters"),
    body("requiredAttendance")
      .optional()
      .isFloat({ min: 50, max: 100 })
      .withMessage("requiredAttendance must be between 50 and 100"),
  ],
  validateRequest,
  createSubject
);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid subject id")],
  validateRequest,
  getSubjectById
);

router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid subject id"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage("Name must be between 2 and 120 characters"),
    body("requiredAttendance")
      .optional()
      .isFloat({ min: 50, max: 100 })
      .withMessage("requiredAttendance must be between 50 and 100"),
  ],
  validateRequest,
  updateSubject
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid subject id")],
  validateRequest,
  deleteSubject
);

module.exports = router;

