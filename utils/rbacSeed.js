const { Role } = require('../models/Role');
const { Permission } = require('../models/Permission');

const STANDARD_PERMISSIONS = [
  // Employee Directory
  { module: 'employee', permission: 'manage_employee', name: 'Manage Employees', description: 'Full administrative management of employee profiles' },
  { module: 'employee', permission: 'create_employee', name: 'Create Employee', description: 'Onboard and create new employee records' },
  { module: 'employee', permission: 'update_employee', name: 'Update Employee', description: 'Modify existing employee profile and credentials' },
  { module: 'employee', permission: 'delete_employee', name: 'Delete Employee', description: 'Remove or archive employee profiles' },
  { module: 'employee', permission: 'view_employee', name: 'View Employee Directory', description: 'View organization employee directory and profiles' },

  // Attendance & Clocking
  { module: 'attendance', permission: 'manage_attendance', name: 'Manage Attendance', description: 'Review, adjust, and administer attendance across the organization' },
  { module: 'attendance', permission: 'manage_attandance', name: 'Manage Attendance (Synonym)', description: 'Attendance administrative management' },
  { module: 'attendance', permission: 'view_attendance', name: 'View Attendance Records', description: 'View personal or department attendance logs' },
  { module: 'attendance', permission: 'add_attendance', name: 'Punch Attendance', description: 'Clock in, clock out, and record daily attendance' },

  // Timesheets
  { module: 'timesheet', permission: 'manage_timesheet', name: 'Manage Timesheets', description: 'Approve, reject, and inspect timesheet logs company-wide' },
  { module: 'timesheet', permission: 'view_timesheet', name: 'View Timesheets', description: 'View personal or team timesheet records' },
  { module: 'timesheet', permission: 'add_timesheet', name: 'Submit Timesheet', description: 'Log hours and submit weekly project timesheets' },

  // Projects & Deliverables
  { module: 'project', permission: 'manage_project', name: 'Manage Projects', description: 'Create, modify, assign, and delete client systems' },
  { module: 'project', permission: 'add_project', name: 'Add Project', description: 'Create and initialize new project deliverables' },
  { module: 'project', permission: 'create_project', name: 'Create Project', description: 'Initialize new project deliverable' },
  { module: 'project', permission: 'update_project', name: 'Update Project', description: 'Update project progress, milestones, and details' },
  { module: 'project', permission: 'assign_project', name: 'Assign Project Squad', description: 'Allocate engineers and architects to project teams' },
  { module: 'project', permission: 'delete_project', name: 'Delete Project', description: 'Remove project deliverables and records' },
  { module: 'project', permission: 'view_project', name: 'View Projects', description: 'View ongoing portfolio systems and milestones' },

  // Task Board
  { module: 'task', permission: 'manage_task', name: 'Manage Tasks', description: 'Full management of project task backlog and sprints' },
  { module: 'task', permission: 'add_task', name: 'Add Task', description: 'Create tasks and sprint items' },
  { module: 'task', permission: 'assign_task', name: 'Assign Task', description: 'Assign tasks to team members' },
  { module: 'task', permission: 'update_task', name: 'Update Task Status', description: 'Progress tasks across backlog, in-progress, and completed' },
  { module: 'task', permission: 'delete_task', name: 'Delete Task', description: 'Remove tasks from board' },
  { module: 'task', permission: 'view_task', name: 'View Tasks', description: 'View personal or team task boards' },

  // Holidays & Calendar
  { module: 'holiday', permission: 'manage_holiday', name: 'Manage Holidays', description: 'Add, update, or remove company calendar holidays' },
  { module: 'holiday', permission: 'add_holiday', name: 'Add Holiday', description: 'Schedule new holiday on company calendar' },
  { module: 'holiday', permission: 'view_holiday', name: 'View Holidays', description: 'View company holiday calendar and leaves' },

  // Payroll
  { module: 'payroll', permission: 'manage_payroll', name: 'Manage Payroll', description: 'Full access to run payroll, generate pay slips, and adjust compensation' },
  { module: 'payroll', permission: 'view_payroll', name: 'View Payroll Reports', description: 'View payroll summaries and compensation charts' },
  { module: 'payroll', permission: 'export_payroll', name: 'Export Payroll', description: 'Download payroll reports and bank disbursement files' },

  // Learning Hub / LMS
  { module: 'learninghub', permission: 'view_learninghub', name: 'View Learning Hub', description: 'Access course catalog and learning resources' },
  { module: 'learninghub', permission: 'manage_learninghub', name: 'Manage Learning Hub', description: 'Curriculum development and course management' },
  { module: 'learninghub', permission: 'manage_batches', name: 'Manage Batches', description: 'Cohort batch scheduling and capacity management' },
  { module: 'learninghub', permission: 'manage_trainers', name: 'Manage Trainers', description: 'Assign instructors and trainers to cohorts' },
  { module: 'learninghub', permission: 'manage_classes', name: 'Manage Live Classes', description: 'Live lectures, recordings, and meeting room management' },
  { module: 'learninghub', permission: 'manage_attendance', name: 'Manage Learning Attendance', description: 'Mark and audit trainee lecture attendance' },
  { module: 'learninghub', permission: 'manage_assignments', name: 'Manage Assignments', description: 'Create and publish batch assignments' },
  { module: 'learninghub', permission: 'grade_submissions', name: 'Grade Submissions', description: 'Grade, review, and feedback student submissions' },
  { module: 'learninghub', permission: 'manage_assessments', name: 'Manage Assessments', description: 'Quizzes, exams, and grading rubrics' },
  { module: 'learninghub', permission: 'issue_certificates', name: 'Issue Certificates', description: 'Issue and revoke verified course completion certificates' },
  { module: 'learninghub', permission: 'access_enrolled_content', name: 'Access Enrolled Content', description: 'Access lessons, player, and cohort syllabus' },
  { module: 'learninghub', permission: 'submit_assignments', name: 'Submit Assignments', description: 'Upload and submit assignments' },
  { module: 'learninghub', permission: 'take_assessments', name: 'Take Assessments', description: 'Participate in module quizzes and exams' },
  { module: 'learninghub', permission: 'view_certificates', name: 'View Certificates', description: 'View and download earned certificates' },

  // Careers & Applications
  { module: 'career', permission: 'manage_career', name: 'Manage Careers', description: 'Post and manage career job openings' },
  { module: 'career', permission: 'manage_applications', name: 'Manage Job Applications', description: 'Review applicant resumes and candidate pipeline' },
  { module: 'career', permission: 'view_career', name: 'View Career Postings', description: 'View job board listings' },

  // Inquiries / Contacts
  { module: 'contacts', permission: 'manage_contact', name: 'Manage Client Inquiries', description: 'Handle incoming prospective client consultation requests' },
  { module: 'contacts', permission: 'manage_contacts', name: 'Manage Contacts (Synonym)', description: 'Handle client consultation inquiries' },
  { module: 'contacts', permission: 'view_contacts', name: 'View Inquiries', description: 'View client inquiry messages' },

  // Blogs & Bulletins
  { module: 'blogs', permission: 'manage_blogs', name: 'Manage Bulletins & Blogs', description: 'Create, edit, and publish company bulletins and articles' },
  { module: 'blogs', permission: 'view_blogs', name: 'View Blogs', description: 'Read corporate news and industry blogs' },

  // Discussions & Community
  { module: 'discussions', permission: 'manage_discussions', name: 'Moderate Discussions', description: 'Moderate discussion channels and messages' },
  { module: 'discussions', permission: 'view_discussions', name: 'Participate in Discussions', description: 'Participate in team and peer channels' },

  // Policies & Grievances
  { module: 'policy', permission: 'manage_policy', name: 'Manage Company Policies', description: 'Draft and enforce enterprise compliance policies' },
  { module: 'policy', permission: 'view_policy', name: 'View Policies', description: 'Read company handbook and conduct policies' },
  { module: 'policy', permission: 'manage_grievance', name: 'Manage Grievances', description: 'Investigate and resolve anonymous grievance reports' },
  { module: 'policy', permission: 'view_grievance', name: 'Submit Grievance', description: 'File grievance and track investigation' },

  // Settings & System RBAC
  { module: 'settings', permission: 'manage_settings', name: 'Manage System Settings', description: 'Configure organization profile, working hours, and integrations' },
  { module: 'settings', permission: 'manage_roles', name: 'Manage Roles', description: 'Create and configure organizational roles' },
  { module: 'settings', permission: 'manage_permissions', name: 'Manage Permissions', description: 'Configure Role-Permission access matrices' },

  // Dashboard & Analytics
  { module: 'dashboard', permission: 'manage_dashboard', name: 'View Operational Dashboard', description: 'Access organization KPI overview, metrics, and analytics' },

  // Universal Recycle Bin
  { module: 'recycle_bin', permission: 'manage_recycle_bin', name: 'Manage Recycle Bin', description: 'Restore soft-deleted records or permanently purge items' },
  { module: 'recycle_bin', permission: 'view_recycle_bin', name: 'View Recycle Bin', description: 'Inspect deleted records in trash' },
];

const STANDARD_ROLES = [
  {
    slug: 'superadmin',
    name: 'Super Administrator',
    description: 'Universal unrestricted master access across all modules and settings',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    isSystem: true,
    priority: 1,
    permissions: ['*'],
  },
  {
    slug: 'admin',
    name: 'Administrator',
    description: 'Full organizational administration rights across employees, operations, and settings',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    isSystem: true,
    priority: 2,
    permissions: [
      'manage_employee', 'create_employee', 'update_employee', 'delete_employee', 'view_employee',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_project', 'add_project', 'create_project', 'update_project', 'assign_project', 'delete_project', 'view_project',
      'manage_task', 'add_task', 'assign_task', 'update_task', 'delete_task', 'view_task',
      'manage_holiday', 'add_holiday', 'view_holiday',
      'manage_payroll', 'view_payroll', 'export_payroll',
      'manage_learninghub', 'view_learninghub', 'manage_batches', 'manage_trainers', 'manage_classes', 'manage_attendance', 'manage_assignments', 'grade_submissions', 'manage_assessments', 'issue_certificates',
      'manage_career', 'manage_applications', 'view_career',
      'manage_contact', 'manage_contacts', 'view_contacts',
      'manage_blogs', 'view_blogs',
      'manage_discussions', 'view_discussions',
      'manage_policy', 'view_policy', 'manage_grievance', 'view_grievance',
      'manage_settings', 'manage_roles', 'manage_permissions',
      'manage_dashboard',
      'manage_recycle_bin', 'view_recycle_bin',
    ],
  },
  {
    slug: 'hr',
    name: 'Human Resources',
    description: 'People Operations, talent acquisition, attendance, and leave administration',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    isSystem: true,
    priority: 3,
    permissions: [
      'manage_employee', 'create_employee', 'update_employee', 'view_employee',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_holiday', 'add_holiday', 'view_holiday',
      'manage_career', 'manage_applications', 'view_career',
      'manage_payroll', 'view_payroll',
      'manage_blogs', 'view_blogs',
      'manage_policy', 'view_policy', 'manage_grievance', 'view_grievance',
      'manage_dashboard',
      'manage_task', 'add_task', 'update_task', 'view_task',
      'manage_contact', 'manage_contacts', 'view_contacts',
    ],
  },
  {
    slug: 'manager',
    name: 'Engineering / Operations Manager',
    description: 'Sprint planning, project governance, employee reviews, and department approvals',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    isSystem: true,
    priority: 4,
    permissions: [
      'view_employee', 'update_employee',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_project', 'add_project', 'create_project', 'update_project', 'assign_project', 'view_project',
      'manage_task', 'add_task', 'assign_task', 'update_task', 'delete_task', 'view_task',
      'manage_holiday', 'view_holiday',
      'view_learninghub',
      'manage_blogs', 'view_blogs',
      'manage_discussions', 'view_discussions',
      'manage_dashboard',
    ],
  },
  {
    slug: 'teamlead',
    name: 'Technical Team Lead',
    description: 'Sprint execution, squad assignment, timesheet reviews, and code quality',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    isSystem: true,
    priority: 5,
    permissions: [
      'view_employee',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_project', 'add_project', 'update_project', 'view_project',
      'manage_task', 'add_task', 'assign_task', 'update_task', 'view_task',
      'manage_holiday', 'view_holiday',
      'view_learninghub',
      'manage_discussions', 'view_discussions',
      'manage_dashboard',
    ],
  },
  {
    slug: 'sales_manager',
    name: 'Sales & Business Manager',
    description: 'Client proposals, project commissions, inquiries, and customer pipeline',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    isSystem: true,
    priority: 6,
    permissions: [
      'manage_project', 'add_project', 'create_project', 'update_project', 'view_project',
      'manage_contact', 'manage_contacts', 'view_contacts',
      'manage_task', 'add_task', 'update_task', 'view_task',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_holiday', 'view_holiday',
      'manage_dashboard',
      'view_blogs',
    ],
  },
  {
    slug: 'development_manager',
    name: 'Development Manager',
    description: 'Engineering systems architecture, squad delivery pace, and release management',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    isSystem: true,
    priority: 6,
    permissions: [
      'manage_project', 'add_project', 'create_project', 'update_project', 'assign_project', 'view_project',
      'manage_task', 'add_task', 'assign_task', 'update_task', 'view_task',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_holiday', 'view_holiday',
      'view_learninghub',
      'manage_dashboard',
    ],
  },
  {
    slug: 'deployment_manager',
    name: 'Deployment & DevOps Manager',
    description: 'Infrastructure environments, release pipelines, and delivery validation',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    isSystem: true,
    priority: 6,
    permissions: [
      'manage_project', 'update_project', 'view_project',
      'manage_task', 'update_task', 'view_task',
      'manage_attendance', 'manage_attandance', 'view_attendance', 'add_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_holiday', 'view_holiday',
      'manage_learninghub', 'view_learninghub',
      'manage_dashboard',
    ],
  },
  {
    slug: 'employee',
    name: 'Employee',
    description: 'Standard team member with self-service attendance, tasks, timesheets, and projects',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    isSystem: true,
    priority: 7,
    permissions: [
      'view_employee',
      'add_attendance', 'view_attendance', 'manage_attandance', 'manage_attendance',
      'add_timesheet', 'view_timesheet', 'manage_timesheet',
      'view_project', 'manage_project',
      'view_task', 'update_task', 'manage_task',
      'view_holiday', 'manage_holiday',
      'manage_blogs', 'view_blogs',
      'view_discussions',
      'view_policy', 'view_grievance',
      'manage_dashboard',
    ],
  },
  {
    slug: 'trainer',
    name: 'Trainer / Instructor',
    description: 'Course instructor managing live lectures, grading, batches, and assessments',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    isSystem: true,
    priority: 8,
    permissions: [
      'view_learninghub', 'manage_learninghub', 'manage_batches', 'manage_classes',
      'manage_attendance', 'manage_assignments', 'grade_submissions', 'manage_assessments',
      'add_attendance', 'view_attendance',
      'manage_timesheet', 'view_timesheet', 'add_timesheet',
      'manage_task', 'view_task', 'update_task',
      'manage_holiday', 'view_holiday',
      'view_discussions',
      'manage_dashboard',
    ],
  },
  {
    slug: 'trainee',
    name: 'Trainee / Learner',
    description: 'Enrolled student participating in cohort classes, assignments, and certificates',
    badgeColor: 'bg-lime-50 text-lime-700 border-lime-200',
    isSystem: true,
    priority: 9,
    permissions: [
      'view_learninghub', 'access_enrolled_content', 'submit_assignments',
      'take_assessments', 'view_certificates',
      'view_discussions',
      'view_policy', 'view_grievance',
    ],
  },
  {
    slug: 'intern',
    name: 'Intern',
    description: 'Internship participant with self-service task board, timesheets, and attendance',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    isSystem: true,
    priority: 10,
    permissions: [
      'view_employee',
      'add_attendance', 'view_attendance', 'manage_attandance', 'manage_attendance',
      'add_timesheet', 'view_timesheet', 'manage_timesheet',
      'view_project',
      'view_task', 'update_task', 'manage_task',
      'view_holiday', 'manage_holiday',
      'view_blogs', 'view_discussions',
      'view_policy',
      'manage_dashboard',
    ],
  },
  {
    slug: 'support_staff',
    name: 'Support Staff',
    description: 'Support personnel with self-attendance, timesheet, and holiday calendar access',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    isSystem: true,
    priority: 11,
    permissions: [
      'add_attendance', 'view_attendance', 'manage_attandance', 'manage_attendance',
      'add_timesheet', 'view_timesheet', 'manage_timesheet',
      'view_holiday', 'manage_holiday',
      'manage_dashboard',
    ],
  },
];

/**
 * Ensures all standard permissions and roles exist in MongoDB with their proper defaults
 */
const initRbacSeed = async () => {
  try {
    console.log('[RBAC Seed] Checking and synchronizing roles and permissions baseline...');

    // 1. Seed Permissions
    for (const perm of STANDARD_PERMISSIONS) {
      await Permission.updateOne(
        { $or: [{ permission: perm.permission }, { slug: perm.permission }] },
        {
          $set: {
            name: perm.name,
            module: perm.module,
            permission: perm.permission,
            slug: perm.permission,
            description: perm.description,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }

    // 2. Fetch all permission slugs in system
    const allPermDocs = await Permission.find().select('slug permission');
    const allPermSlugs = allPermDocs.map((p) => p.permission || p.slug);

    // 3. Seed Roles
    for (const r of STANDARD_ROLES) {
      const existingRole = await Role.findOne({ slug: r.slug });
      
      let finalPermissions = r.permissions;
      if (r.slug === 'superadmin') {
        finalPermissions = allPermSlugs;
      }

      if (!existingRole) {
        await Role.create({
          slug: r.slug,
          name: r.name,
          description: r.description,
          badgeColor: r.badgeColor,
          isSystem: r.isSystem,
          priority: r.priority,
          permissions: finalPermissions,
        });
        console.log(`[RBAC Seed] Seeded missing role '${r.slug}' with ${finalPermissions.length} permissions.`);
      } else {
        // If role exists but permissions are empty, populate defaults
        if (!existingRole.permissions || existingRole.permissions.length === 0) {
          existingRole.permissions = finalPermissions;
          await existingRole.save();
          console.log(`[RBAC Seed] Populated empty permissions for role '${r.slug}'.`);
        } else if (r.slug === 'superadmin') {
          // Superadmin always has all permissions
          existingRole.permissions = allPermSlugs;
          await existingRole.save();
        }
      }
    }

    console.log('[RBAC Seed] Roles and Permissions synchronized successfully.');
  } catch (error) {
    console.error('[RBAC Seed Error]:', error.message);
  }
};

module.exports = {
  initRbacSeed,
  STANDARD_PERMISSIONS,
  STANDARD_ROLES,
};
