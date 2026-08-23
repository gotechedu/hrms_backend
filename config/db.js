const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gotechedu_hrms';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
