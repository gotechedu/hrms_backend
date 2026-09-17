const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { User } = require('./models/User');
const { Role } = require('./models/Role');
const { Attendance, LeaveRequest } = require('./models/Attendance');
const { Timesheet } = require('./models/Timesheet');
const { Task } = require('./models/Task');
const jwt = require('jsonwebtoken');

let server;
const PORT = 5098;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, rawBody: body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runRoleOperationsTests() {
  console.log('--- Testing Backend Operations Scoped by Role & Assigned Permissions ---');
  server = app.listen(PORT);

  try {
    // 1. Create or ensure Test Superadmin User
    let superadmin = await User.findOne({ email: 'test.superadmin@gotechedu.com' });
    if (!superadmin) {
      superadmin = await User.create({
        name: 'Test Superadmin',
        email: 'test.superadmin@gotechedu.com',
        password: 'password123',
        role: 'superadmin',
        status: 'active',
      });
    }
    const superadminToken = jwt.sign(
      { id: superadmin._id, role: superadmin.role },
      process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure'
    );

    // 2. Create or ensure Test Employee User (Regular employee, cannot approve leaves/timesheets)
    let employee = await User.findOne({ email: 'test.employee@gotechedu.com' });
    if (!employee) {
      employee = await User.create({
        name: 'Test Regular Employee',
        email: 'test.employee@gotechedu.com',
        password: 'password123',
        role: 'employee',
        status: 'active',
      });
    }
    const employeeToken = jwt.sign(
      { id: employee._id, role: employee.role },
      process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure'
    );

    // 3. Create or ensure Test Manager User (Manager role with approve_leave and manage_timesheet permissions)
    let manager = await User.findOne({ email: 'test.manager@gotechedu.com' });
    if (!manager) {
      manager = await User.create({
        name: 'Test Operations Manager',
        email: 'test.manager@gotechedu.com',
        password: 'password123',
        role: 'manager',
        status: 'active',
      });
    }
    const managerToken = jwt.sign(
      { id: manager._id, role: manager.role },
      process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure'
    );

    console.log('✅ Test users setup: Superadmin, Manager, Employee');

    // TEST 1: Employee applies for leave
    const leaveRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/attendance/leave',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
      },
      {
        type: 'Casual Leave',
        from: '2026-10-01',
        to: '2026-10-02',
        days: 2,
        reason: 'Personal errand',
      }
    );
    console.log(`TEST 1: Employee applies for leave: ${leaveRes.status}`);
    const leaveId = leaveRes.body.leave?._id;

    // TEST 2: Employee attempts to approve their own or any leave request (Should be REJECTED 403 Forbidden)
    const empApproveRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/attendance/leaves/${leaveId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
      },
      { status: 'Approved' }
    );
    console.log(`TEST 2: Employee unauthorized approval rejected: ${empApproveRes.status} (Expected 403)`);
    if (empApproveRes.status !== 403) {
      throw new Error(`Expected 403 for unauthorized leave approval, got ${empApproveRes.status}`);
    }

    // TEST 3: Manager or Superadmin approves leave request (Should be ALLOWED 200 OK)
    const mgrApproveRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/attendance/leaves/${leaveId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
      },
      { status: 'Approved' }
    );
    console.log(`TEST 3: Superadmin authorized approval accepted: ${mgrApproveRes.status} (Expected 200)`);
    if (mgrApproveRes.status !== 200) {
      throw new Error(`Expected 200 for authorized leave approval, got ${mgrApproveRes.status}`);
    }

    // TEST 4: Employee logs timesheet
    const tsRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/timesheets',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
      },
      {
        weekStartDate: '2026-09-14',
        project: 'GoTech RBAC Engine',
        client: 'Enterprise Client',
        dailyHours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
      }
    );
    console.log(`TEST 4: Employee logs timesheet: ${tsRes.status}`);
    const timesheetId = tsRes.body.timesheet?._id;

    // TEST 5: Employee attempts to approve timesheet (Should be REJECTED 403 Forbidden)
    const empTsApproveRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/timesheets/${timesheetId}/status`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${employeeToken}`,
        },
      },
      { status: 'Approved' }
    );
    console.log(`TEST 5: Employee unauthorized timesheet approval rejected: ${empTsApproveRes.status} (Expected 403)`);
    if (empTsApproveRes.status !== 403) {
      throw new Error(`Expected 403 for unauthorized timesheet approval, got ${empTsApproveRes.status}`);
    }

    // TEST 6: Superadmin / Manager approves timesheet (Should be ALLOWED 200 OK)
    const mgrTsApproveRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/timesheets/${timesheetId}/status`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
      },
      { status: 'Approved', remarks: 'Good work, timesheet verified.' }
    );
    console.log(`TEST 6: Superadmin authorized timesheet approval accepted: ${mgrTsApproveRes.status} (Expected 200)`);
    if (mgrTsApproveRes.status !== 200) {
      throw new Error(`Expected 200 for authorized timesheet approval, got ${mgrTsApproveRes.status}`);
    }

    // Clean up created records
    await LeaveRequest.findByIdAndDelete(leaveId);
    await Timesheet.findByIdAndDelete(timesheetId);

    console.log('\n🎉 ALL ROLE & ASSIGNED PERMISSION OPERATION TESTS PASSED SUCCESSFULLY! (6/6)');
  } catch (err) {
    console.error('❌ Test Failure:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runRoleOperationsTests();
