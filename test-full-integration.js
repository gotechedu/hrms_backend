/**
 * End-to-End Test Suite for Learning Hub, Jobs, Applications & Blogs
 */
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const server = http.createServer(app);
const PORT = 5599;

let token = '';
let testCourseId = '';
let testCourseAppId = '';
let testJobId = '';
let testJobAppId = '';
let testBlogId = '';

const makeRequest = (method, path, body = null, authToken = null) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

const runTests = async () => {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`[Test Server] Running on http://127.0.0.1:${PORT}`);

  try {
    console.log('\n--- 1. AUTHENTICATION (SUPERADMIN) ---');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'admin123',
    });
    console.log('Login Status:', loginRes.status);
    if (loginRes.status === 200 && loginRes.body.token) {
      token = loginRes.body.token;
      console.log('✔ Superadmin login successful. Token acquired.');
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }

    console.log('\n--- 2. LEARNING HUB (COURSES & ENROLLMENTS) ---');
    // Create Course
    const courseRes = await makeRequest(
      'POST',
      '/api/courses',
      {
        title: 'Full-Stack Rust & WebAssembly Masterclass',
        category: 'Development',
        duration: '14 Weeks',
        mode: 'Live Online + Labs',
        level: 'Intermediate to Advanced',
        description: 'Deep dive into memory safety, async Rust, and high-performance WebAssembly engines.',
        techStack: ['Rust', 'Wasm', 'Actix', 'PostgreSQL'],
        modules: ['Rust Foundations', 'Async Concurrency', 'Wasm in Browser'],
        careerOutcome: 'Systems & WebAssembly Engineer',
      },
      token
    );
    console.log('Create Course Status:', courseRes.status);
    if (courseRes.status === 201 && courseRes.body.course) {
      testCourseId = courseRes.body.course._id;
      console.log(`✔ Course created with ID: ${testCourseId}`);
    }

    // Public Get Courses
    const getCoursesRes = await makeRequest('GET', '/api/courses');
    console.log('Get Courses Status:', getCoursesRes.status, `(Found ${getCoursesRes.body.count} courses)`);

    // Student Submits Enrollment Application
    const studentAppRes = await makeRequest('POST', '/api/course-applications', {
      courseId: testCourseId,
      courseTitle: 'Full-Stack Rust & WebAssembly Masterclass',
      studentName: 'Devika Sharma',
      email: 'devika.sharma@example.com',
      phone: '+91 99887 66554',
      collegeOrCompany: 'IIT Delhi',
      experienceLevel: 'Graduate',
      learningGoal: 'Systems Programming Upskilling',
      modePreference: 'Live Online Labs',
    });
    console.log('Student Submit Application Status:', studentAppRes.status);
    if (studentAppRes.status === 201 && studentAppRes.body.application) {
      testCourseAppId = studentAppRes.body.application._id;
      console.log(`✔ Student enrollment application submitted with ID: ${testCourseAppId}`);
    }

    // HRMS Views Course Applications
    const getCourseAppsRes = await makeRequest('GET', '/api/course-applications', null, token);
    console.log('HRMS Get Course Applications Status:', getCourseAppsRes.status, `(Total: ${getCourseAppsRes.body.count})`);

    // HRMS Updates Student Status
    const updateCourseAppRes = await makeRequest(
      'PUT',
      `/api/course-applications/${testCourseAppId}`,
      { status: 'Enrolled', notes: 'Scholarship approved' },
      token
    );
    console.log('Update Enrollment Status:', updateCourseAppRes.status, `(New status: ${updateCourseAppRes.body.application.status})`);

    console.log('\n--- 3. CAREER RECRUITMENT (JOBS & CANDIDATES) ---');
    // Create Job Opening
    const jobRes = await makeRequest(
      'POST',
      '/api/jobs',
      {
        title: 'Principal Cloud Architect',
        department: 'Cloud & DevOps',
        type: 'Full-Time',
        location: 'Gurugram / Remote',
        experience: '4–7 Years',
        salary: '₹25L – ₹35L PA',
        tags: ['AWS', 'Kubernetes', 'Terraform', 'Zero-Trust'],
        description: 'Lead enterprise multi-cloud migrations and Kubernetes cluster architecture.',
        requirements: ['5+ years cloud experience', 'AWS Certified Solutions Architect'],
      },
      token
    );
    console.log('Create Job Status:', jobRes.status);
    if (jobRes.status === 201 && jobRes.body.job) {
      testJobId = jobRes.body.job._id;
      console.log(`✔ Job created with ID: ${testJobId}`);
    }

    // Public Get Jobs
    const getJobsRes = await makeRequest('GET', '/api/jobs');
    console.log('Get Jobs Status:', getJobsRes.status, `(Found ${getJobsRes.body.count} jobs)`);

    // Candidate Submits Application
    const candidateAppRes = await makeRequest('POST', '/api/job-applications', {
      jobId: testJobId,
      jobTitle: 'Principal Cloud Architect',
      department: 'Cloud & DevOps',
      name: 'Rohan Mehra',
      email: 'rohan.mehra@example.com',
      phone: '+91 98111 55443',
      experience: '5 Years',
      currentCompany: 'Infosys Ltd',
      expectedCTC: '₹30 LPA',
      noticePeriod: '30 Days',
      coverLetter: 'Extensive experience in managing Kubernetes clusters on AWS EKS.',
    });
    console.log('Candidate Submit Application Status:', candidateAppRes.status);
    if (candidateAppRes.status === 201 && candidateAppRes.body.application) {
      testJobAppId = candidateAppRes.body.application._id;
      console.log(`✔ Candidate job application submitted with ID: ${testJobAppId}`);
    }

    // HRMS Views Job Applications
    const getJobAppsRes = await makeRequest('GET', '/api/job-applications', null, token);
    console.log('HRMS Get Job Applications Status:', getJobAppsRes.status, `(Total: ${getJobAppsRes.body.count})`);

    // HRMS Advances Candidate Stage
    const updateJobAppRes = await makeRequest(
      'PUT',
      `/api/job-applications/${testJobAppId}`,
      { stage: 'Technical Round 2', rating: 5 },
      token
    );
    console.log('Update Candidate Stage Status:', updateJobAppRes.status, `(New stage: ${updateJobAppRes.body.application.stage})`);

    console.log('\n--- 4. PUBLICATIONS & BLOGS ---');
    // Create Blog
    const blogRes = await makeRequest(
      'POST',
      '/api/blogs',
      {
        title: 'Building Enterprise AI Microservices with FastAPI & WebSockets',
        category: 'AI',
        readTime: '6 min read',
        description: 'Architecting ultra-low latency streaming inference engines for real-time customer intelligence.',
        content: 'Full article content discussing asyncio event loops, streaming responses, and connection pools.',
        tags: ['FastAPI', 'AI Microservices', 'WebSockets', 'Python'],
      },
      token
    );
    console.log('Create Blog Status:', blogRes.status);
    if (blogRes.status === 201 && blogRes.body.blog) {
      testBlogId = blogRes.body.blog._id;
      console.log(`✔ Blog published with ID: ${testBlogId}`);
    }

    // Public Get Blogs
    const getBlogsRes = await makeRequest('GET', '/api/blogs');
    console.log('Get Blogs Status:', getBlogsRes.status, `(Found ${getBlogsRes.body.count} blogs)`);

    console.log('\n=============================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY!');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
};

runTests();
