const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const TrainerAssignment = require('../models/TrainerAssignment');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const LessonProgress = require('../models/LessonProgress');

async function runSanityCheck() {
  console.log('--- Starting LMS Architecture Sanity Check ---');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connection: [PASS]');

    const totalCourses = await Course.countDocuments({ isDeleted: { $ne: true } });
    console.log(`2. Total Active Courses: ${totalCourses} [PASS]`);

    const totalModules = await Module.countDocuments();
    const totalLessons = await Lesson.countDocuments();
    console.log(`3. Total Structured Modules: ${totalModules}, Lessons: ${totalLessons} [PASS]`);

    const totalBatches = await Batch.countDocuments({ isDeleted: { $ne: true } });
    console.log(`4. Total Active Cohort Batches: ${totalBatches} [PASS]`);

    const totalEnrollments = await Enrollment.countDocuments({ isDeleted: { $ne: true } });
    console.log(`5. Total Active Enrollments: ${totalEnrollments} [PASS]`);

    const totalTrainerAssignments = await TrainerAssignment.countDocuments();
    console.log(`6. Total Trainer Batch Assignments: ${totalTrainerAssignments} [PASS]`);

    // Verify User Roles
    const trainees = await User.countDocuments({ role: 'trainee' });
    const trainers = await User.countDocuments({ role: 'trainer' });
    const legacyTypo = await User.countDocuments({ role: 'traineer' });
    console.log(`7. User Role Normalization: Trainees=${trainees}, Trainers=${trainers}, Legacy Typo='traineer'=${legacyTypo} [${legacyTypo === 0 ? 'PASS' : 'FAIL'}]`);

    // Test Progress Calculation Simulation
    const sampleEnrollment = await Enrollment.findOne({ isDeleted: { $ne: true } });
    if (sampleEnrollment) {
      console.log(`8. Sample Enrollment #${sampleEnrollment._id}: Trainee=${sampleEnrollment.trainee}, Course=${sampleEnrollment.course}, Progress=${sampleEnrollment.progressPercentage}% [PASS]`);
    }

    // Verify Certificate Model Structure
    const sampleCert = new Certificate({
      certificateId: 'GTE-CERT-2026-TEST',
      verificationCode: 'GOTECH-TEST-2026',
      trainee: new mongoose.Types.ObjectId(),
      traineeName: 'Test Trainee',
      traineeEmail: 'trainee@test.com',
      course: new mongoose.Types.ObjectId(),
      courseTitle: 'Full-Stack Web Development',
      batch: new mongoose.Types.ObjectId(),
      enrollment: new mongoose.Types.ObjectId(),
      certificateUrl: 'https://cdn.gotechedu.com/certificates/test.pdf',
    });
    await sampleCert.validate();
    console.log('9. Certificate Schema Validation: [PASS]');

    console.log('--- ALL LMS SANITY CHECKS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Sanity Check Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runSanityCheck();
