const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

const { Course } = require('../models/Course');
const { Module } = require('../models/Module');
const { Lesson } = require('../models/Lesson');
const { Batch } = require('../models/Batch');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const course = await Course.findOne({ isDeleted: { $ne: true } });
  console.log('COURSE FOUND:', course.title);

  const modules = await Module.find({ course: course._id }).sort({ order: 1 });
  console.log('MODULES COUNT:', modules.length);

  for (const m of modules) {
    const lessons = await Lesson.find({ module: m._id }).sort({ order: 1 });
    console.log(` - Module: ${m.title} (${lessons.length} lessons)`);
  }

  const batches = await Batch.find({ course: course._id });
  console.log('BATCHES COUNT:', batches.length, batches.map(b => b.name));

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
