require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const AttendanceEntry = require("./models/AttendanceEntry");

const PORT = process.env.PORT || 5000;

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing. Add it to your environment variables.");
  }

  await connectDB();
  await AttendanceEntry.syncIndexes();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
