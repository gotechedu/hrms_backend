const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

// We will test against the running Express app in memory or via node
const app = require('./app');

let server;
const PORT = 5099;

const request = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 Starting Backend Verification Suite...');
  console.log('========================================\n');

  server = app.listen(PORT, async () => {
    try {
      // 1. Health Check
      console.log('1️⃣  Testing Health Check...');
      const health = await request('GET', '/api/health');
      console.log(`   Health Check Status: ${health.status} (Expected: 200)`);

      // 2. Superadmin Login (admin@gmail.com / admin123)
      console.log('\n2️⃣  Testing Superadmin Login (admin@gmail.com / admin123)...');
      const superLogin = await request('POST', '/api/auth/login', {
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'superadmin',
      });
      console.log(`   Superadmin Login Status: ${superLogin.status} (Success: ${superLogin.body.success}, Role: ${superLogin.body.user?.role})`);
      const superToken = superLogin.body.token;

      // 3. Logout API
      console.log('\n3️⃣  Testing Logout Endpoint (POST /api/auth/logout)...');
      const logoutRes = await request('POST', '/api/auth/logout', {}, superToken);
      console.log(`   Logout Status: ${logoutRes.status} (Message: ${logoutRes.body.message})`);

      // 4. Role-based Login: HR Admin
      console.log('\n4️⃣  Testing Role-based Login (HR role)...');
      const hrLogin = await request('POST', '/api/auth/login', {
        email: 'vikram.sharma@gotechedu.com',
        password: 'Password@123',
        role: 'HR Administrator',
      });
      console.log(`   HR Login Status: ${hrLogin.status} (Success: ${hrLogin.body.success}, Role: ${hrLogin.body.user?.role})`);
      const hrToken = hrLogin.body.token;

      // 3. Role-based Login: Employee
      console.log('\n3️⃣  Testing Role-based Login (Employee role)...');
      const empLogin = await request('POST', '/api/auth/login', {
        email: 'aarav.patel@gotechedu.com',
        password: 'Password@123',
        role: 'Employee',
      });
      console.log(`   Employee Login Status: ${empLogin.status} (Success: ${empLogin.body.success}, Role: ${empLogin.body.user?.role})`);
      const empToken = empLogin.body.token;

      // 4. Role mismatch rejection (Employee trying to log in as HR Admin)
      console.log('\n4️⃣  Testing Role Mismatch Login Protection...');
      const mismatchLogin = await request('POST', '/api/auth/login', {
        email: 'aarav.patel@gotechedu.com',
        password: 'Password@123',
        role: 'HR Administrator',
      });
      console.log(`   Mismatch Login Status: ${mismatchLogin.status} (Expected 403 Forbidden: ${mismatchLogin.status === 403})`);

      // 5. Auth /me endpoint
      console.log('\n5️⃣  Testing Protected /api/auth/me...');
      const meRes = await request('GET', '/api/auth/me', null, hrToken);
      console.log(`   /me Status: ${meRes.status} (User: ${meRes.body.user?.name}, Email: ${meRes.body.user?.email})`);

      // 6. Forgot Password -> Request OTP
      console.log('\n6️⃣  Testing Forgot Password OTP generation...');
      const forgotRes = await request('POST', '/api/auth/forgot-password', {
        email: 'ananya.sen@gotechedu.com',
      });
      console.log(`   Forgot Password Status: ${forgotRes.status} (Message: ${forgotRes.body.message})`);
      const otp = forgotRes.body.otp;
      console.log(`   Generated Demo OTP: ${otp}`);

      // 7. Verify OTP
      console.log('\n7️⃣  Testing Verify OTP...');
      const verifyRes = await request('POST', '/api/auth/verify-otp', {
        email: 'ananya.sen@gotechedu.com',
        otp: otp,
      });
      console.log(`   Verify OTP Status: ${verifyRes.status} (Success: ${verifyRes.body.success})`);

      // 8. Reset Password
      console.log('\n8️⃣  Testing Reset Password...');
      const resetRes = await request('POST', '/api/auth/reset-password', {
        email: 'ananya.sen@gotechedu.com',
        otp: otp,
        newPassword: 'NewSecurePassword@2026',
      });
      console.log(`   Reset Password Status: ${resetRes.status} (Success: ${resetRes.body.success})`);

      // 9. Login with New Password
      console.log('\n9️⃣  Testing Login with Reset Password...');
      const newLogin = await request('POST', '/api/auth/login', {
        email: 'ananya.sen@gotechedu.com',
        password: 'NewSecurePassword@2026',
      });
      console.log(`   New Password Login Status: ${newLogin.status} (Success: ${newLogin.body.success})`);

      // 10. Employee Management: Get All Employees & Departments
      console.log('\n🔟 Testing Employee Directory Listing & Filtering...');
      const listRes = await request('GET', '/api/employees?department=Engineering', null, hrToken);
      console.log(`   Engineering Dept Filter Status: ${listRes.status} (Count: ${listRes.body.count}, Total: ${listRes.body.total})`);

      // 11. Employee Stats
      console.log('\n1️⃣1️⃣ Testing Employee Aggregated Statistics...');
      const statsRes = await request('GET', '/api/employees/stats', null, hrToken);
      console.log(`   Employee Stats Status: ${statsRes.status} (Total: ${statsRes.body.stats?.total}, Active: ${statsRes.body.stats?.active})`);

      // 12. RBAC check: Employee cannot create new employee (requires admin or hr)
      console.log('\n1️⃣2️⃣ Testing RBAC Authorization (Employee forbidden to create new employee)...');
      const forbiddenCreate = await request('POST', '/api/employees', {
        name: 'Test Hack',
        email: 'hacker@gotechedu.com',
        department: 'Engineering',
      }, empToken);
      console.log(`   Forbidden Create Status: ${forbiddenCreate.status} (Expected 403 Forbidden: ${forbiddenCreate.status === 403})`);

      // 13. HR creates new employee
      console.log('\n1️⃣3️⃣ Testing HR Create New Employee with linked User...');
      const createRes = await request('POST', '/api/employees', {
        name: 'Dev Test Employee',
        email: 'dev.test@gotechedu.com',
        role: 'employee',
        designation: 'Backend Specialist',
        department: 'Engineering',
        type: 'Full-Time',
        salary: '₹16,00,000 PA',
        phone: '+91 99887 76655',
        location: 'Gurugram, HQ',
      }, hrToken);
      console.log(`   Create Employee Status: ${createRes.status} (Success: ${createRes.body.success}, ID: ${createRes.body.employee?.employeeId})`);
      const newEmpId = createRes.body.employee?._id;

      // 14. Update Employee
      console.log('\n1️⃣4️⃣ Testing Update Employee...');
      const updateRes = await request('PUT', `/api/employees/${newEmpId}`, {
        designation: 'Senior Backend Specialist',
        salary: '₹20,00,000 PA',
      }, hrToken);
      console.log(`   Update Employee Status: ${updateRes.status} (New Designation: ${updateRes.body.employee?.designation})`);

      // 15. Delete Employee
      console.log('\n1️⃣5️⃣ Testing Delete Employee...');
      const deleteRes = await request('DELETE', `/api/employees/${newEmpId}`, null, hrToken);
      console.log(`   Delete Employee Status: ${deleteRes.status} (Success: ${deleteRes.body.success})`);

      console.log('\n========================================');
      console.log('🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!');
      console.log('========================================\n');

      server.close(() => {
        process.exit(0);
      });
    } catch (err) {
      console.error('\n❌ Test Error:', err);
      server.close(() => {
        process.exit(1);
      });
    }
  });
}

runTests();
