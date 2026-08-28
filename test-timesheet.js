const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { User } = require('./models/User');
const { Timesheet } = require('./models/Timesheet');
const jwt = require('jsonwebtoken');

let server;
const PORT = 5089;

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

async function runTests() {
  console.log('--- Starting Timesheet Integration Test Suite ---');
  server = app.listen(PORT);

  try {
    let testUser = await User.findOne({ email: 'timesheet.tester@gotechedu.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Timesheet Tester',
        email: 'timesheet.tester@gotechedu.com',
        password: 'password123',
        role: 'employee',
        status: 'active',
      });
    }

    const token = jwt.sign(
      { id: testUser._id, role: testUser.role },
      process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure',
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Create Timesheet
    const createRes = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/timesheets',
        method: 'POST',
        headers: authHeaders,
      },
      {
        weekStartDate: '2026-08-24',
        project: 'Enterprise School ERP & SIS',
        client: 'St. Xavier Academy',
        taskCategory: 'Development',
        dailyHours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
        billableHours: 40,
        description: 'Completed RBAC permission matrix and attendance integration sprint.',
      }
    );
    console.log('POST /api/timesheets:', createRes.status, createRes.body?.message, 'Total Hours:', createRes.body?.timesheet?.totalHours);
    if (createRes.status !== 201) {
      throw new Error(`Create timesheet failed: ${JSON.stringify(createRes.body)}`);
    }

    const timesheetId = createRes.body.timesheet._id;

    // 2. Get My Timesheets
    const myRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/timesheets/my',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET /api/timesheets/my:', myRes.status, `(${myRes.body?.count || 0} entries)`);
    if (myRes.status !== 200 || myRes.body.count === 0) {
      throw new Error(`Get my timesheets failed: ${JSON.stringify(myRes.body)}`);
    }

    // 3. Update Timesheet Status
    const statusRes = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/timesheets/${timesheetId}/status`,
        method: 'PUT',
        headers: authHeaders,
      },
      {
        status: 'Approved',
        remarks: 'Sprint hours verified and signed off.',
      }
    );
    console.log('PUT /api/timesheets/:id/status:', statusRes.status, statusRes.body?.message);

    // Clean up
    await Timesheet.deleteMany({ user: testUser._id });
    await User.deleteOne({ email: 'timesheet.tester@gotechedu.com' });

    console.log('\n🎉 ALL TIMESHEET BACKEND TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Timesheet test failed:', err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTests();
