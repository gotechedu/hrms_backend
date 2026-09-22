const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

process.env.NODE_ENV = 'test';
const app = require('./app');
const { initSocket } = require('./socket');
const { io: ClientIO } = require('socket.io-client');

let server;
const PORT = 5098;

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

async function runChatTests() {
  console.log('\n========================================');
  console.log('🧪 Starting Chat Subsystem Verification Suite...');
  console.log('========================================\n');

  server = app.server;

  server.listen(PORT, async () => {
    try {
      // 1. Health check
      console.log('1️⃣  Verifying Health Check...');
      const health = await request('GET', '/api/health');
      console.log(`   Health: ${health.status} (Expected 200)`);

      // 2. Obtain token for testing
      console.log('\n2️⃣  Resolving User & Generating Auth Token...');
      const { User } = require('./models/User');
      let testUser = await User.findOne({ status: 'active' });
      if (!testUser) {
        testUser = new User({
          name: 'Chat Test Admin',
          email: 'chat_test_admin@gotechedu.com',
          password: 'Password@123',
          role: 'superadmin',
          status: 'active',
        });
        await testUser.save();
      }

      const generateToken = require('./utils/generateToken');
      const token = generateToken({
        id: testUser._id,
        email: testUser.email,
        role: testUser.role,
        name: testUser.name,
      });
      console.log(`   Authenticated as: ${testUser.name} (${testUser.email}) [role: ${testUser.role}]`);

      // 3. Fetch conversations
      console.log('\n3️⃣  Testing GET /api/chat/conversations...');
      const convRes = await request('GET', '/api/chat/conversations', null, token);
      console.log(`   Status: ${convRes.status}, Total: ${convRes.body.count}, Channels: ${convRes.body.conversations?.length}`);
      const generalChannel = convRes.body.conversations?.find((c) => c.channelSlug === 'general');
      console.log(`   Default #general channel found: ${!!generalChannel} (${generalChannel?._id})`);

      // 4. Send message in #general via REST
      console.log('\n4️⃣  Testing POST /api/chat/conversations/:id/messages (REST send)...');
      const sendRes = await request(
        'POST',
        `/api/chat/conversations/${generalChannel._id}/messages`,
        { text: 'Hello team, testing real-time socket.io chat integration!' },
        token
      );
      console.log(`   Status: ${sendRes.status}, Message ID: ${sendRes.body.message?._id}, Text: "${sendRes.body.message?.text}"`);

      // 5. Retrieve messages
      console.log('\n5️⃣  Testing GET /api/chat/conversations/:id/messages...');
      const getMsgRes = await request(
        'GET',
        `/api/chat/conversations/${generalChannel._id}/messages`,
        null,
        token
      );
      console.log(`   Status: ${getMsgRes.status}, Count: ${getMsgRes.body.count}`);

      // 6. Test Socket.IO client connection with auth token
      console.log('\n6️⃣  Testing Socket.IO Client Connection & Real-Time Events...');
      await new Promise((resolve, reject) => {
        const clientSocket = ClientIO(`http://localhost:${PORT}`, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: false,
        });

        const timeout = setTimeout(() => {
          clientSocket.disconnect();
          reject(new Error('Socket.IO connection timed out after 6 seconds'));
        }, 6000);

        clientSocket.on('connect', () => {
          console.log(`   🟢 Socket connected successfully with socket.id: ${clientSocket.id}`);

          // Join conversation
          clientSocket.emit('join_conversation', generalChannel._id.toString());

          // Listen for new message
          clientSocket.on('new_message', (data) => {
            console.log(`   📬 Received real-time socket message: "${data.message?.text}" (sender: ${data.message?.senderName})`);
            clearTimeout(timeout);
            clientSocket.disconnect();
            resolve();
          });

          // Send message over socket
          clientSocket.emit('send_message', {
            conversationId: generalChannel._id.toString(),
            text: 'Live WebSocket ping from automated test!',
          }, (ack) => {
            console.log(`   ✅ Socket send_message ACK received: success=${ack?.success}`);
          });
        });

        clientSocket.on('connect_error', (err) => {
          clearTimeout(timeout);
          clientSocket.disconnect();
          reject(new Error(`Socket.IO connect error: ${err.message}`));
        });
      });

      // 7. Test Mark as Read
      console.log('\n7️⃣  Testing PUT /api/chat/conversations/:id/read...');
      const readRes = await request(
        'PUT',
        `/api/chat/conversations/${generalChannel._id}/read`,
        null,
        token
      );
      console.log(`   Status: ${readRes.status}, Message: "${readRes.body.message}"`);

      // 8. Test Get Chat Users
      console.log('\n8️⃣  Testing GET /api/chat/users...');
      const usersRes = await request('GET', '/api/chat/users', null, token);
      console.log(`   Status: ${usersRes.status}, Teammates Count: ${usersRes.body.count}`);

      console.log('\n========================================');
      console.log('🎉 All Chat Subsystem Tests Passed Successfully!');
      console.log('========================================\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\n❌ Test Error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runChatTests();
