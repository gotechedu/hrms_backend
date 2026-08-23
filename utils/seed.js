const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { User } = require('../models/User');
const { Employee } = require('../models/Employee');
const { Course } = require('../models/Course');
const { Job } = require('../models/Job');
const { Blog } = require('../models/Blog');

dotenv.config();

const sampleUsers = [
  {
    name: "Super Administrator",
    email: "admin@gmail.com",
    password: "admin123",
    role: "superadmin",
    designation: "Enterprise Superadmin & Owner",
    department: "Engineering",
    type: "Full-Time",
    status: "Active",
    salary: "₹50,00,000 PA",
    location: "Gurugram, HQ",
    phone: "+91 99999 00000",
    employeeId: "GTE-1000",
  },
  {
    name: "Vikram Sharma",
    email: "vikram.sharma@gotechedu.com",
    password: "Password@123",
    role: "hr",
    designation: "Head of People Operations",
    department: "People Operations & HR",
    type: "Full-Time",
    status: "Active",
    salary: "₹22,00,000 PA",
    location: "Gurugram, HQ",
    phone: "+91 98101 23456",
    employeeId: "GTE-1001",
  },
  {
    name: "Aditya Rai",
    email: "admin@gotechedu.com",
    password: "Password@123",
    role: "admin",
    designation: "Principal Architect & Admin",
    department: "Engineering",
    type: "Full-Time",
    status: "Active",
    salary: "₹35,00,000 PA",
    location: "Gurugram, HQ",
    phone: "+91 98111 22334",
    employeeId: "GTE-1002",
  },
  {
    name: "Priya Nair",
    email: "priya.nair@gotechedu.com",
    password: "Password@123",
    role: "manager",
    designation: "Engineering Manager",
    department: "Engineering",
    type: "Full-Time",
    status: "Active",
    salary: "₹28,00,000 PA",
    location: "Bengaluru Hub",
    phone: "+91 98222 33445",
    employeeId: "GTE-1003",
  },
  {
    name: "Rohit Verma",
    email: "rohit.verma@gotechedu.com",
    password: "Password@123",
    role: "teamlead",
    designation: "Cloud & DevOps Lead",
    department: "Cloud & DevOps",
    type: "Full-Time",
    status: "Active",
    salary: "₹24,00,000 PA",
    location: "Gurugram, HQ",
    phone: "+91 98333 44556",
    employeeId: "GTE-1004",
  },
  {
    name: "Aarav Patel",
    email: "aarav.patel@gotechedu.com",
    password: "Password@123",
    role: "employee",
    designation: "Full Stack Engineer",
    department: "Engineering",
    type: "Full-Time",
    status: "Active",
    salary: "₹18,00,000 PA",
    location: "Gurugram, HQ",
    phone: "+91 98444 55667",
    employeeId: "GTE-1005",
  },
  {
    name: "Ananya Sen",
    email: "ananya.sen@gotechedu.com",
    password: "Password@123",
    role: "intern",
    designation: "AI & Data Science Intern",
    department: "AI & Data Science",
    type: "Internship",
    status: "Active",
    salary: "₹4,50,000 PA",
    location: "Remote",
    phone: "+91 98555 66778",
    employeeId: "GTE-1006",
  },
];

const seedData = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/gotechedu_hrms";
    await mongoose.connect(mongoUri);
    console.log(`[Seed] Connected to MongoDB at: ${mongoUri}`);

    // Clear existing collection records
    await User.deleteMany({});
    await Employee.deleteMany({});
    console.log("[Seed] Cleared existing Users and Employees.");

    for (const item of sampleUsers) {
      // 1. Create Employee
      const employee = new Employee({
        employeeId: item.employeeId,
        name: item.name,
        email: item.email,
        phone: item.phone,
        role: item.role,
        designation: item.designation,
        department: item.department,
        type: item.type,
        status: item.status,
        salary: item.salary,
        location: item.location,
        skills: ["JavaScript", "Node.js", "React", "MongoDB", "System Design"],
        emergencyContact: {
          name: "Contact Person",
          relation: "Family",
          phone: "+91 99000 11223",
        },
        bankDetails: {
          accountHolder: item.name,
          accountNumber: "918230918230",
          ifscCode: "HDFC0001234",
          bankName: "HDFC Bank",
        },
      });
      await employee.save();

      // 2. Create User
      const user = new User({
        name: item.name,
        email: item.email,
        password: item.password,
        role: item.role,
        employeeProfile: employee._id,
        status: "active",
      });
      await user.save();

      // 3. Link back
      employee.user = user._id;
      await employee.save();

      console.log(
        `[Seed] Created User & Employee: ${item.name} | Role: ${item.role} | Email: ${item.email}`,
      );
    }

    // Seed Initial Courses for Learning Hub
    await Course.deleteMany({});
    const sampleCourses = [
      {
        title: "Full-Stack Next.js & React Engineering",
        category: "Development",
        duration: "16 Weeks",
        mode: "Live Online + Capstone Labs",
        level: "Beginner to Advanced",
        badge: "Most Popular",
        color: "from-blue-600 to-cyan-500",
        bgSoft: "bg-blue-50",
        textCol: "text-blue-600",
        borderCol: "border-blue-100",
        description:
          "Master modern frontend and full-stack development. Build production-grade web applications using React 19, Next.js App Router, TypeScript, Tailwind CSS, and Server Actions.",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL"],
        modules: [
          "Modern JavaScript ES6+ & TypeScript Mastery",
          "React 19 Hooks, State, and Component Architecture",
          "Next.js App Router, SSR, SSG, and Server Actions",
          "RESTful & GraphQL API Integrations with PostgreSQL",
          "Capstone Project: Multi-Tenant Enterprise SaaS Platform",
        ],
        careerOutcome: "Frontend / Full-Stack Engineer (₹8L – ₹18L PA)",
        status: "Active",
      },
      {
        title: "Enterprise MERN Stack Architecture",
        category: "Development",
        duration: "16 Weeks",
        mode: "Live Interactive",
        level: "Intermediate",
        badge: "High Demand",
        color: "from-emerald-600 to-teal-500",
        bgSoft: "bg-emerald-50",
        textCol: "text-emerald-600",
        borderCol: "border-emerald-100",
        description:
          "Deep dive into full-cycle JavaScript development. Build high-throughput REST APIs with Node.js and Express, architect MongoDB schemas, and integrate microservices with Redis caching.",
        techStack: ["MongoDB", "Express.js", "React", "Node.js", "Redis", "Docker"],
        modules: [
          "Advanced Node.js Event Loop & Asynchronous Architecture",
          "MongoDB Indexing, Aggregation Pipelines & Atlas",
          "JWT Authentication, Role-Based Access & Security",
          "Redis Caching & Real-Time WebSockets Architecture",
          "Capstone Project: Real-Time Omnichannel ERP & Chat System",
        ],
        careerOutcome: "Full-Stack Node/React Developer (₹9L – ₹20L PA)",
        status: "Active",
      },
      {
        title: "Generative AI & Agentic Systems Engineering",
        category: "AI & Data",
        duration: "14 Weeks",
        mode: "Live Labs + Research Project",
        level: "Intermediate to Advanced",
        badge: "Flagship AI",
        color: "from-purple-600 to-indigo-600",
        bgSoft: "bg-purple-50",
        textCol: "text-purple-600",
        borderCol: "border-purple-100",
        description:
          "Learn to architect autonomous multi-agent systems, build enterprise RAG pipelines with vector databases, and fine-tune open-source LLMs using PyTorch and Hugging Face.",
        techStack: ["Python", "PyTorch", "LangChain", "LlamaIndex", "ChromaDB", "FastAPI"],
        modules: [
          "Prompt Engineering & Foundation Model Paradigms",
          "Enterprise RAG Architecture & Vector Embeddings",
          "Multi-Agent Orchestration with LangGraph & CrewAI",
          "LLM Fine-Tuning with LoRA & QLoRA on Custom Data",
          "Capstone Project: Autonomous Enterprise Research Agent",
        ],
        careerOutcome: "AI Engineer / LLM Architect (₹14L – ₹28L PA)",
        status: "Active",
      },
    ];
    await Course.insertMany(sampleCourses);
    console.log(`[Seed] Seeded ${sampleCourses.length} Learning Hub Courses.`);

    // Seed Initial Job Openings
    await Job.deleteMany({});
    const sampleJobs = [
      {
        title: "Senior Frontend Engineer",
        department: "Engineering",
        type: "Full-Time",
        location: "Gurugram / Remote",
        experience: "2–4 Years",
        salary: "₹10L – ₹18L PA",
        tags: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
        description:
          "Architect and ship high-performance, accessible web applications and dashboards with modern micro-frontend principles.",
        requirements: [
          "2+ years experience building production applications in React & Next.js",
          "Strong proficiency in TypeScript and responsive CSS styling",
          "Experience with state management (Redux / Zustand)",
        ],
        status: "Active",
      },
      {
        title: "Full-Stack MERN Developer",
        department: "Engineering",
        type: "Full-Time",
        location: "Gurugram / Hybrid",
        experience: "2–5 Years",
        salary: "₹12L – ₹20L PA",
        tags: ["Node.js", "Express", "MongoDB", "React", "Docker"],
        description:
          "Design and deploy scalable REST/GraphQL APIs, microservices, and database models for enterprise SaaS solutions.",
        requirements: [
          "Proficiency in Node.js, Express, and MongoDB schema design",
          "Experience building RESTful APIs with JWT authentication",
          "Familiarity with Docker and cloud deployment pipelines",
        ],
        status: "Active",
      },
      {
        title: "AI & Machine Learning Engineer",
        department: "AI & Data",
        type: "Full-Time",
        location: "Gurugram / Remote",
        experience: "2–5 Years",
        salary: "₹14L – ₹24L PA",
        tags: ["Python", "PyTorch", "LLMs", "LangChain", "RAG"],
        description:
          "Build autonomous AI agents, enterprise RAG vector search pipelines, and fine-tune open-source models for client workflows.",
        requirements: [
          "Experience working with LangChain, LlamaIndex, or Vector DBs",
          "Python backend development with FastAPI or Flask",
          "Understanding of LLM fine-tuning techniques (LoRA/QLoRA)",
        ],
        status: "Active",
      },
    ];
    await Job.insertMany(sampleJobs);
    console.log(`[Seed] Seeded ${sampleJobs.length} Career Job Openings.`);

    // Seed Initial Blogs
    await Blog.deleteMany({});
    const sampleBlogs = [
      {
        title: "How Autonomous AI Agents Are Transforming Enterprise Operations in 2026",
        slug: "how-ai-is-transforming-modern-businesses",
        category: "AI",
        date: "Aug 18, 2026",
        readTime: "6 min read",
        coverImage: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80",
        author: {
          name: "Dr. Vikram Sharma",
          role: "Head of AI Research",
          initials: "VS",
          avatarBg: "bg-blue-600",
        },
        badge: "Featured Insight",
        description:
          "Explore how multi-agent LLM systems and retrieval-augmented generation (RAG) are eliminating manual back-office tasks, automating tier-1 customer support, and driving 4x operational speed.",
        tags: ["Autonomous Agents", "Enterprise RAG", "LLMs", "Automation"],
        status: "Published",
      },
      {
        title: "Multi-Cloud vs Hybrid Cloud: Choosing the Right Architecture for Scale",
        slug: "why-cloud-computing-matters-for-growing-businesses",
        category: "Cloud",
        date: "Aug 14, 2026",
        readTime: "5 min read",
        coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        author: {
          name: "Sarah Jenkins",
          role: "Principal Cloud Architect",
          initials: "SJ",
          avatarBg: "bg-indigo-600",
        },
        badge: "Cloud & DevOps",
        description:
          "A deep technical breakdown of multi-region AWS and Azure failover architectures, zero-downtime Kubernetes deployments, and cost-optimization frameworks.",
        tags: ["AWS", "Kubernetes", "DevOps", "Multi-Cloud"],
        status: "Published",
      },
      {
        title: "Next.js 16 App Router vs Traditional Single Page Apps: Production Benchmarks",
        slug: "nextjs-vs-react-which-one-should-you-choose",
        category: "Technology",
        date: "Aug 10, 2026",
        readTime: "7 min read",
        coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
        author: {
          name: "Aditya Verma",
          role: "Lead Frontend Architect",
          initials: "AV",
          avatarBg: "bg-cyan-600",
        },
        badge: "Web Architecture",
        description:
          "An in-depth performance analysis measuring Core Web Vitals, server actions concurrency, partial prerendering (PPR), and SEO rankings across high-traffic platforms.",
        tags: ["Next.js 16", "React 19", "Performance", "Web Development"],
        status: "Published",
      },
    ];
    await Blog.insertMany(sampleBlogs);
    console.log(`[Seed] Seeded ${sampleBlogs.length} Blog Articles.`);

    console.log(
      "\n[Seed Completed] Database successfully populated with Users, Employees, Courses, Jobs, and Blogs!",
    );
    console.log("Credentials for all accounts:");
    console.log("Superadmin: admin@gmail.com / admin123");
    console.log("Password for other accounts: Password@123");

    process.exit(0);
  } catch (error) {
    console.error("[Seed Error]:", error);
    process.exit(1);
  }
};

seedData();
