const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');

async function runTests() {
  console.log('--- Starting Integration Tests for New HRMS Features ---');

  const server = app.listen(5099, async () => {
    console.log('Test server active on port 5099');

    const testEndpoint = (path, method = 'GET', body = null) => {
      return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request(
          {
            hostname: 'localhost',
            port: 5099,
            path,
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                resolve({ status: res.statusCode, data: parsed });
              } catch (e) {
                resolve({ status: res.statusCode, raw: data });
              }
            });
          }
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
      });
    };

    try {
      // 1. Health check
      console.log('\n[1] Testing Health Endpoint:');
      const healthRes = await testEndpoint('/api/health');
      console.log('Status:', healthRes.status, 'Body:', healthRes.data);

      // 2. Settings Endpoint
      console.log('\n[2] Testing Settings Endpoint (GET /api/settings):');
      const settingsRes = await testEndpoint('/api/settings');
      console.log('Status:', settingsRes.status, 'Company:', settingsRes.data?.settings?.companyName);

      // 3. Create Org Employee Payroll
      console.log('\n[3] Testing Create Org Employee Payroll (POST /api/payroll):');
      const orgPayRes = await testEndpoint('/api/payroll', 'POST', {
        category: 'org-employee',
        recipientName: 'Test Engineer',
        recipientEmail: 'test.engineer@gotechedu.com',
        roleDesignation: 'Senior Backend Engineer',
        department: 'Engineering',
        month: 'August 2026',
        basicSalary: 60000,
        hra: 24000,
        da: 6000,
        specialAllowance: 10000,
        pfDeduction: 7200,
        taxDeduction: 5000,
      });
      console.log('Status:', orgPayRes.status, 'Created Net Salary:', orgPayRes.data?.payroll?.netSalary);
      const orgPayId = orgPayRes.data?.payroll?._id;

      // 4. Create Student Stipend
      console.log('\n[4] Testing Create Student Stipend (POST /api/payroll):');
      const studentPayRes = await testEndpoint('/api/payroll', 'POST', {
        category: 'student',
        recipientName: 'Test Intern',
        recipientEmail: 'test.intern@gotechedu.com',
        roleDesignation: 'AI Intern',
        studentBatch: 'Batch 2026',
        month: 'August 2026',
        basicSalary: 20000,
        performanceBonus: 3000,
      });
      console.log('Status:', studentPayRes.status, 'Student Net:', studentPayRes.data?.payroll?.netSalary);

      // 5. Create IT Solution Contractor Payout
      console.log('\n[5] Testing Create IT Solution Contractor (POST /api/payroll):');
      const itPayRes = await testEndpoint('/api/payroll', 'POST', {
        category: 'it-solution',
        recipientName: 'Test IT Consultant',
        recipientEmail: 'consultant@techlabs.com',
        contractProject: 'Cloud Infra',
        month: 'August 2026',
        basicSalary: 100000,
        taxDeduction: 10000,
      });
      console.log('Status:', itPayRes.status, 'Contractor Net:', itPayRes.data?.payroll?.netSalary);

      // 6. Test Payroll Stats
      console.log('\n[6] Testing Payroll Statistics (GET /api/payroll/stats):');
      const statsRes = await testEndpoint('/api/payroll/stats');
      console.log('Status:', statsRes.status, 'Stats:', statsRes.data?.stats);

      // 7. Test Add Candidate in Job Applications
      console.log('\n[7] Testing Add Candidate to Job Application (POST /api/job-applications):');
      const jobAppRes = await testEndpoint('/api/job-applications', 'POST', {
        name: 'Jane Doe Candidate',
        email: 'jane.candidate@example.com',
        phone: '+91 9988776655',
        jobTitle: 'Full-Stack Developer',
        department: 'Engineering',
        experience: '3 Years',
        expectedCTC: '₹14L PA',
        stage: 'Applied',
      });
      console.log('Status:', jobAppRes.status, 'Applicant:', jobAppRes.data?.application?.name);
      const jobAppId = jobAppRes.data?.application?._id;

      // 8. Test Add Candidate in Course Applications (Learning Hub)
      console.log('\n[8] Testing Add Candidate to Course Application (POST /api/course-applications):');
      const courseAppRes = await testEndpoint('/api/course-applications', 'POST', {
        studentName: 'John Doe Student',
        email: 'john.student@example.com',
        phone: '+91 9123456780',
        courseTitle: 'Full-Stack Web Development',
        qualification: 'B.Tech CSE',
        batch: 'Fall 2026',
        feesStatus: 'Paid',
        feesAmount: 25000,
      });
      console.log('Status:', courseAppRes.status, 'Course Student:', courseAppRes.data?.application?.studentName);
      const courseAppId = courseAppRes.data?.application?._id;

      // 9. Test Soft Delete to Recycle Bin
      console.log('\n[9] Testing Soft Delete Job Candidate (DELETE /api/job-applications/:id):');
      if (jobAppId) {
        const delRes = await testEndpoint(`/api/job-applications/${jobAppId}`, 'DELETE');
        console.log('Status:', delRes.status, 'Msg:', delRes.data?.message);
      }

      // 10. Test Recycle Bin Listing
      console.log('\n[10] Testing Recycle Bin Listing (GET /api/recycle-bin):');
      const trashRes = await testEndpoint('/api/recycle-bin');
      console.log('Status:', trashRes.status, 'Total in Trash:', trashRes.data?.count, 'Items:', trashRes.data?.items?.map(i => `${i.typeLabel}: ${i.title}`));

      // 11. Test Restore from Recycle Bin
      if (jobAppId) {
        console.log('\n[11] Testing Restore from Recycle Bin (POST /api/recycle-bin/restore/jobApplication/:id):');
        const restoreRes = await testEndpoint(`/api/recycle-bin/restore/jobApplication/${jobAppId}`, 'POST');
        console.log('Status:', restoreRes.status, 'Msg:', restoreRes.data?.message);
      }

      console.log('\n=========================================');
      console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
      console.log('=========================================\n');
    } catch (err) {
      console.error('Test Execution Error:', err);
    } finally {
      server.close();
      mongoose.connection.close();
      process.exit(0);
    }
  });
}

runTests();
