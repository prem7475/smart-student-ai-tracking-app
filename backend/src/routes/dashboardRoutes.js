const express = require("express");
const auth = require("../middleware/auth");
const { getOverview } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/overview", auth, getOverview);

module.exports = router;

