const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

const normalizeRoles = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gotechedu_hrms';
    await mongoose.connect(mongoUri);
    console.log('[Migration] Connected to MongoDB');

    const db = mongoose.connection.db;
    const rolesColl = db.collection('roles');
    const usersColl = db.collection('users');
    const permissionsColl = db.collection('permissions');

    // 1. Ensure learning permissions exist in permissions collection
    const lmsPermissions = [
      { module: 'learninghub', permission: 'view_learninghub', name: 'View Learning Hub', description: 'Access course catalog and learning hub' },
      { module: 'learninghub', permission: 'manage_learninghub', name: 'Manage Learning Hub', description: 'Create and edit courses, curriculum, and settings' },
      { module: 'learninghub', permission: 'manage_batches', name: 'Manage Batches', description: 'Create and manage cohort batches' },
      { module: 'learninghub', permission: 'manage_trainers', name: 'Manage Trainers', description: 'Assign trainers to batches' },
      { module: 'learninghub', permission: 'manage_classes', name: 'Manage Live Classes', description: 'Schedule and manage batch classes' },
      { module: 'learninghub', permission: 'manage_attendance', name: 'Manage Learning Attendance', description: 'Mark and review learning attendance' },
      { module: 'learninghub', permission: 'manage_assignments', name: 'Manage Assignments', description: 'Create and review assignments' },
      { module: 'learninghub', permission: 'grade_submissions', name: 'Grade Submissions', description: 'Grade student assignment submissions' },
      { module: 'learninghub', permission: 'manage_assessments', name: 'Manage Assessments', description: 'Create quizzes and exams' },
      { module: 'learninghub', permission: 'issue_certificates', name: 'Issue Certificates', description: 'Issue and revoke certificates' },
      { module: 'learninghub', permission: 'access_enrolled_content', name: 'Access Enrolled Content', description: 'Access lessons, player, and resources' },
      { module: 'learninghub', permission: 'submit_assignments', name: 'Submit Assignments', description: 'Upload and submit assignments' },
      { module: 'learninghub', permission: 'take_assessments', name: 'Take Assessments', description: 'Take quizzes and exams' },
      { module: 'learninghub', permission: 'view_certificates', name: 'View Certificates', description: 'View and download earned certificates' },
    ];

    for (const p of lmsPermissions) {
      await permissionsColl.updateOne(
        { permission: p.permission },
        { $set: p, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }
    console.log('[Migration] Ensured LMS permissions in DB');

    // 2. Fix 'traineer' typo in roles collection
    const traineerRole = await rolesColl.findOne({ slug: 'traineer' });
    if (traineerRole) {
      await rolesColl.updateOne(
        { _id: traineerRole._id },
        {
          $set: {
            slug: 'trainer',
            name: 'Trainer',
            description: 'Course Instructor & Cohort Trainer',
            permissions: [
              'view_learninghub',
              'manage_learninghub',
              'manage_classes',
              'manage_attendance',
              'manage_assignments',
              'grade_submissions',
              'manage_assessments',
            ],
            updatedAt: new Date(),
          },
        }
      );
      console.log('[Migration] Updated role "traineer" -> "trainer"');
    } else {
      await rolesColl.updateOne(
        { slug: 'trainer' },
        {
          $set: {
            name: 'Trainer',
            description: 'Course Instructor & Cohort Trainer',
            badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
            permissions: [
              'view_learninghub',
              'manage_learninghub',
              'manage_classes',
              'manage_attendance',
              'manage_assignments',
              'grade_submissions',
              'manage_assessments',
            ],
            updatedAt: new Date(),
          },
          $setOnInsert: { isSystem: true, createdAt: new Date() },
        },
        { upsert: true }
      );
      console.log('[Migration] Ensured "trainer" role in DB');
    }

    // 3. Ensure 'trainee' role in roles collection
    await rolesColl.updateOne(
      { slug: 'trainee' },
      {
        $set: {
          name: 'Trainee',
          description: 'Enrolled Course Learner',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          permissions: [
            'view_learninghub',
            'access_enrolled_content',
            'submit_assignments',
            'take_assessments',
            'view_certificates',
          ],
          updatedAt: new Date(),
        },
        $setOnInsert: { isSystem: true, createdAt: new Date() },
      },
      { upsert: true }
    );
    console.log('[Migration] Ensured "trainee" role in DB');

    // 4. Update any users with role 'traineer' to 'trainer'
    const usersUpdateResult = await usersColl.updateMany(
      { role: 'traineer' },
      { $set: { role: 'trainer', updatedAt: new Date() } }
    );
    console.log(`[Migration] Updated ${usersUpdateResult.modifiedCount} users from role 'traineer' to 'trainer'`);

    // 5. Check users with enrolledCourses but role 'employee' who are not actual staff
    // (We inspect them for reference)
    const paidTraineesAsEmployees = await usersColl.find({
      role: 'employee',
      employeeProfile: null,
      $or: [
        { 'enrolledCourses.0': { $exists: true } },
        { collegeOrCompany: { $exists: true, $ne: '' } },
      ],
    }).toArray();

    console.log(`[Migration] Found ${paidTraineesAsEmployees.length} users with role 'employee' without employeeProfile who have enrollments:`);
    for (const u of paidTraineesAsEmployees) {
      console.log(` - ${u.name} (${u.email}) enrolled in ${u.enrolledCourses?.length || 0} courses`);
    }

    console.log('[Migration] Role normalization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error]:', error);
    process.exit(1);
  }
};

normalizeRoles();
