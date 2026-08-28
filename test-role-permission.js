const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { User } = require('./models/User');
const { Role } = require('./models/Role');
const { Permission } = require('./models/Permission');
const jwt = require('jsonwebtoken');

let server;
const PORT = 5099;

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
  console.log('--- Starting Role & Permission Integration Test Suite ---');
  
  // Start test server
  server = app.listen(PORT);
  
  try {
    // 1. Create or find test admin user and generate token
    let admin = await User.findOne({ email: 'roleadmin.test@gotechedu.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Role Test Superadmin',
        email: 'roleadmin.test@gotechedu.com',
        password: 'password123',
        role: 'superadmin',
        status: 'active',
      });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'gotech_hrms_super_secret_jwt_key_2026_secure',
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    console.log('✅ Admin test user & token ready');

    // 2. Test GET /api/roles
    const getRolesRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/roles',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET /api/roles:', getRolesRes.status, `(${getRolesRes.body?.count || 0} roles found)`);
    if (getRolesRes.status !== 200 || !getRolesRes.body?.roles) {
      throw new Error(`GET /api/roles failed: ${JSON.stringify(getRolesRes.body)}`);
    }

    // 3. Test POST /api/roles (Create custom role)
    const newRoleData = {
      name: 'Content Strategist ' + Date.now().toString().slice(-4),
      description: 'Manages promotional media and learning resources',
      badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
      permissions: ['blogs', 'courses'],
    };
    const createRoleRes = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/roles',
        method: 'POST',
        headers: authHeaders,
      },
      newRoleData
    );
    console.log('POST /api/roles:', createRoleRes.status, createRoleRes.body?.message);
    if (createRoleRes.status !== 201 || !createRoleRes.body?.role) {
      throw new Error(`POST /api/roles failed: ${JSON.stringify(createRoleRes.body)}`);
    }
    const createdRole = createRoleRes.body.role;

    // 4. Test GET /api/permissions
    const getPermsRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/permissions',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET /api/permissions:', getPermsRes.status, `(${getPermsRes.body?.count || 0} permissions found)`);
    if (getPermsRes.status !== 200 || !getPermsRes.body?.permissions) {
      throw new Error(`GET /api/permissions failed: ${JSON.stringify(getPermsRes.body)}`);
    }

    // 5. Test GET /api/permissions/matrix
    const getMatrixRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/permissions/matrix',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET /api/permissions/matrix:', getMatrixRes.status, 'Matrix keys:', Object.keys(getMatrixRes.body?.matrix || {}));
    if (getMatrixRes.status !== 200 || !getMatrixRes.body?.matrix) {
      throw new Error(`GET /api/permissions/matrix failed: ${JSON.stringify(getMatrixRes.body)}`);
    }

    // 6. Test PUT /api/roles/:id/permissions
    const assignPermRes = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api/roles/${createdRole.slug}/permissions`,
        method: 'PUT',
        headers: authHeaders,
      },
      { permissions: ['blogs', 'courses', 'projects'] }
    );
    console.log('PUT /api/roles/:id/permissions:', assignPermRes.status, assignPermRes.body?.message);
    if (assignPermRes.status !== 200 || !assignPermRes.body?.role?.permissions.includes('projects')) {
      throw new Error(`PUT /api/roles/:id/permissions failed: ${JSON.stringify(assignPermRes.body)}`);
    }

    // 7. Test PUT /api/permissions/matrix (Update matrix)
    const currentMatrix = getMatrixRes.body.matrix;
    currentMatrix[createdRole.slug] = {
      ...currentMatrix[createdRole.slug],
      payroll: true,
    };
    const updateMatrixRes = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/permissions/matrix',
        method: 'PUT',
        headers: authHeaders,
      },
      { matrix: currentMatrix }
    );
    console.log('PUT /api/permissions/matrix:', updateMatrixRes.status, updateMatrixRes.body?.message);
    if (updateMatrixRes.status !== 200) {
      throw new Error(`PUT /api/permissions/matrix failed: ${JSON.stringify(updateMatrixRes.body)}`);
    }

    // 8. Test DELETE /api/roles/:id
    const deleteRoleRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/roles/${createdRole.slug}`,
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('DELETE /api/roles/:id:', deleteRoleRes.status, deleteRoleRes.body?.message);
    if (deleteRoleRes.status !== 200) {
      throw new Error(`DELETE /api/roles/:id failed: ${JSON.stringify(deleteRoleRes.body)}`);
    }

    // 9. Clean up test user
    await User.deleteOne({ email: 'roleadmin.test@gotechedu.com' });

    console.log('\n🎉 ALL ROLE & PERMISSION BACKEND TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

runTests();
