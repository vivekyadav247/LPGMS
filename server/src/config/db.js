const mongoose = require("mongoose");
const env = require("./env");

let isConnected = false;

async function connectDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  const mongoUri = env.MONGODB_URL;

  if (!mongoUri) {
    throw new Error("MONGODB_URL is not configured");
  }

  await mongoose.connect(mongoUri, {
    dbName: env.MONGODB_DB || "lpgms",
  });

  isConnected = true;
  return mongoose.connection;
}

module.exports = connectDatabase;
