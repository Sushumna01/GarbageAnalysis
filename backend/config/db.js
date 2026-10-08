const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MongoDB URI not configured. Database features are disabled until MONGO_URI is set.");
    return;
  }

  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
