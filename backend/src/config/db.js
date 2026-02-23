const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it to your environment variables.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  // Minimal startup signal for local debugging.
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;

