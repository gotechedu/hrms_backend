const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { User } = require('./models/User');
const { Attendance } = require('./models/Attendance');
const jwt = require('jsonwebtoken');

let server;
const PORT = 5088;

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
  console.log('--- Starting Attendance Clock-In/Out & IP Telemetry Test Suite ---');
  server = app.listen(PORT);

  try {
    let testUser = await User.findOne({ email: 'attendance.tester@gotechedu.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Attendance Tester',
        email: 'attendance.tester@gotechedu.com',
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

    // Clean any today record for testUser
    const today = new Date().toISOString().split('T')[0];
    await Attendance.deleteMany({ user: testUser._id });

    // 1. Clock In
    const clockInRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/attendance/clock-in',
      method: 'POST',
      headers: authHeaders,
    });
    console.log('POST /api/attendance/clock-in:', clockInRes.status, clockInRes.body?.message);
    if (clockInRes.status !== 201) {
      throw new Error(`Clock in failed: ${JSON.stringify(clockInRes.body)}`);
    }

    // 2. Check Today Status
    const todayRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/attendance/today',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET /api/attendance/today:', todayRes.status, 'isCheckedIn:', todayRes.body?.isCheckedIn, 'IP:', todayRes.body?.record?.ipAddress);
    if (todayRes.status !== 200 || !todayRes.body?.isCheckedIn) {
      throw new Error(`Today status check failed: ${JSON.stringify(todayRes.body)}`);
    }

    // 3. Clock Out
    const clockOutRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/attendance/clock-out',
      method: 'POST',
      headers: authHeaders,
    });
    console.log('POST /api/attendance/clock-out:', clockOutRes.status, clockOutRes.body?.message, 'Total Time:', clockOutRes.body?.record?.totalHours);
    if (clockOutRes.status !== 200) {
      throw new Error(`Clock out failed: ${JSON.stringify(clockOutRes.body)}`);
    }

    // 4. Get My Attendance History
    const myRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/attendance/my',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET /api/attendance/my:', myRes.status, `(${myRes.body?.count || 0} records)`);
    if (myRes.status !== 200) {
      throw new Error(`My attendance fetch failed: ${JSON.stringify(myRes.body)}`);
    }

    // Clean up
    await Attendance.deleteMany({ user: testUser._id });
    await User.deleteOne({ email: 'attendance.tester@gotechedu.com' });

    console.log('\n🎉 ALL ATTENDANCE BACKEND TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Attendance test failed:', err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTests();
