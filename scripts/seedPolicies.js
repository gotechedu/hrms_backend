const mongoose = require('mongoose');
require('dotenv').config();
const Policy = require('../models/Policy');
const Grievance = require('../models/Grievance');

const initialPolicies = [
  {
    policyCode: 'POL-ETH-001',
    title: 'Workplace Conduct, Anti-Harassment & Zero-Tolerance Code',
    category: 'Workplace Environment',
    scope: 'Org-Wide',
    targetRoles: [],
    version: 'v2.4',
    effectiveDate: '2026-01-01',
    lastReviewed: '2026-08-15',
    summary:
      'GoTechEdu enforces strict zero-tolerance toward workplace harassment, unlawful discrimination, and verbal abuse. Guarantees safe, equitable, and dignified working conditions for every individual.',
    clauses: [
      {
        clauseNumber: '1.1',
        heading: 'Principle of Mutual Dignity & Non-Discrimination',
        text: 'All personnel, irrespective of hierarchy, gender, religion, sexual orientation, disability, or marital status, shall be treated with absolute dignity and professional respect.',
        isMandatory: true,
      },
      {
        clauseNumber: '1.2',
        heading: 'Anti-Harassment & POSH Compliance Framework',
        text: 'Any unwelcome physical, verbal, digital, or non-verbal conduct of a sexual, bullying, or intimidating nature constitutes gross misconduct punishable by immediate termination.',
        isMandatory: true,
      },
      {
        clauseNumber: '1.3',
        heading: 'Whistleblower Protection & Non-Retaliation Clause',
        text: 'The organization strictly prohibits any retaliatory action against an employee filing a report in good faith. Any retaliator faces immediate suspension and permanent disciplinary blacklisting.',
        isMandatory: true,
      },
    ],
    status: 'Active',
    requiresAcknowledgement: true,
  },
  {
    policyCode: 'POL-PAY-002',
    title: 'Compensation, Overtime Auditing & Expense Reimbursement Charter',
    category: 'Payroll & Overtime',
    scope: 'Org-Wide',
    targetRoles: [],
    version: 'v3.1',
    effectiveDate: '2026-02-01',
    lastReviewed: '2026-08-20',
    summary:
      'Establishes transparent guidelines regarding salary disbursement on the 1st of every calendar month, weekend overtime compensation, and verified business expense reimbursements within 5 business days.',
    clauses: [
      {
        clauseNumber: '2.1',
        heading: 'Timely Compensation Disbursement Guarantee',
        text: 'Net salaries and direct bank deposits will be executed on or before the 1st of every calendar month. If the 1st falls on a public holiday, disbursement occurs on the preceding business day.',
        isMandatory: true,
      },
      {
        clauseNumber: '2.2',
        heading: 'Overtime & Weekend Critical Shift Credit',
        text: 'Pre-approved production deployments and weekend shift escalations exceeding 45 regular weekly hours qualify for 1.5x overtime pay or 1:1 compensatory off credits.',
        isMandatory: true,
      },
      {
        clauseNumber: '2.3',
        heading: 'Expense Reimbursement Standard Operating Procedure',
        text: 'Authorized travel, client hospitality, and cloud infrastructure expenses supported by GST-compliant invoices will be audited and reimbursed within 5 banking days.',
        isMandatory: false,
      },
    ],
    status: 'Active',
    requiresAcknowledgement: true,
  },
  {
    policyCode: 'POL-INF-003',
    title: 'Hardware Asset Allocation, Security & Acceptable Usage Protocol',
    category: 'Equipment & Infrastructure',
    scope: 'Org-Wide',
    targetRoles: [],
    version: 'v1.8',
    effectiveDate: '2026-03-10',
    lastReviewed: '2026-07-30',
    summary:
      'Defines employee custodianship of GoTechEdu company-issued MacBooks/workstations, security badge access, Dual-Factor Authentication mandates, and prohibited unauthorized peripheral hardware.',
    clauses: [
      {
        clauseNumber: '3.1',
        heading: 'Asset Custodianship & Care Standards',
        text: 'Laptops, test devices, and specialized peripherals issued to employees remain GoTechEdu property and must be maintained in good physical and digital hygiene.',
        isMandatory: true,
      },
      {
        clauseNumber: '3.2',
        heading: 'Prohibition of Unvetted Software & Torrenting',
        text: 'Installing pirated software, peer-to-peer file sharing clients, or unvetted browser extensions on enterprise machines triggers immediate security compliance lockouts.',
        isMandatory: true,
      },
      {
        clauseNumber: '3.3',
        heading: 'Hardware Refresh & Upgrade Cycle',
        text: 'All primary workstations are scheduled for preventive maintenance audits every 12 months and eligible for performance hardware upgrades after 24 months of active service.',
        isMandatory: false,
      },
    ],
    status: 'Active',
    requiresAcknowledgement: true,
  },
  {
    policyCode: 'POL-MGR-004',
    title: 'Managerial Performance Review & Progressive Disciplinary Arbitration',
    category: 'Disciplinary Framework',
    scope: 'Role-Based',
    targetRoles: ['Manager', 'TeamLead', 'Lead', 'Admin', 'HR'],
    version: 'v2.0',
    effectiveDate: '2026-01-15',
    lastReviewed: '2026-08-01',
    summary:
      'Restricted directive for Engineering Managers and Team Leads detailing statutory arbitration procedures, PIP (Performance Improvement Plan) timelines, and dispute mediation steps.',
    clauses: [
      {
        clauseNumber: '4.1',
        heading: 'Progressive Escalation Ladder',
        text: 'Performance or behavioral issues must first be addressed via documented 1-on-1 coaching, followed by a formal written notice, and finally a 30-day structured PIP prior to separation.',
        isMandatory: true,
      },
      {
        clauseNumber: '4.2',
        heading: 'Neutral Arbitration & Dispute Mediation',
        text: 'Employees contesting a negative review or disciplinary sanction possess the unconditional right to request an independent HR ombudsman arbitration hearing.',
        isMandatory: true,
      },
      {
        clauseNumber: '4.3',
        heading: 'Confidentiality of Personnel Records',
        text: 'Performance evaluations and disciplinary audit logs must be treated with strict confidentiality and never disclosed to unauthorized peers or external entities.',
        isMandatory: true,
      },
    ],
    status: 'Active',
    requiresAcknowledgement: true,
  },
  {
    policyCode: 'POL-SEC-005',
    title: 'Zero-Trust Cloud Architecture, Secrets Management & Code Integrity',
    category: 'Remote Work & Security',
    scope: 'Role-Based',
    targetRoles: ['Developer', 'Engineer', 'DevOps', 'Architect', 'TechLead'],
    version: 'v4.0',
    effectiveDate: '2026-04-01',
    lastReviewed: '2026-09-01',
    summary:
      'Mandatory security directives for Engineering and DevOps personnel covering GitHub access, SSH key rotation, cloud credentials, database connection strings, and zero-trust VPN policies.',
    clauses: [
      {
        clauseNumber: '5.1',
        heading: 'Prohibition of Hardcoded API Secrets & Private Keys',
        text: 'API keys, database passwords, and private certificates must never be committed to source code repositories under any circumstances. Automated Git-guardian pre-commit hooks are mandatory.',
        isMandatory: true,
      },
      {
        clauseNumber: '5.2',
        heading: 'Cloud Bastion & WireGuard VPN Tunneling',
        text: 'Access to AWS / MongoDB Atlas production environments requires active WireGuard VPN authentication and hardware TOTP token approval.',
        isMandatory: true,
      },
    ],
    status: 'Active',
    requiresAcknowledgement: true,
  },
];

const initialGrievances = [
  {
    grievanceId: 'GRV-2026-104',
    isAnonymous: false,
    filerName: 'Rohit Verma',
    filerDepartment: 'Engineering',
    filerEmail: 'rohit.v@gotechedu.com',
    category: 'Payroll & Overtime',
    severity: 'Medium',
    subject: 'Discrepancy in Q3 Weekend Deployment Compensatory Off Hours',
    statement:
      'During the August 14th weekend migration, our team logged 14 hours of off-cycle production support. The compensatory time-off balance in the portal only reflected 8 hours. Requesting balance reconciliation.',
    status: 'Resolved',
    assignedOfficer: {
      name: 'Pooja Nair',
      role: 'Head of People Operations',
      assignedAt: new Date('2026-08-16'),
    },
    resolutionOutcome:
      'Verified server access logs and corroborated 14 hours logged. Additional 6 hours compensatory leave credited to Rohit Verma balance on August 18, 2026. Matter resolved satisfactorily.',
    resolvedAt: new Date('2026-08-18'),
    auditTrail: [
      {
        date: new Date('2026-08-15T10:30:00Z'),
        actionBy: 'Rohit Verma',
        action: 'Incident Filed',
        notes: 'Discrepancy submitted via employee portal with shift timesheet attachments.',
        stage: 'Submitted',
      },
      {
        date: new Date('2026-08-16T14:15:00Z'),
        actionBy: 'Pooja Nair (HR)',
        action: 'Arbitration Review Initiated',
        notes: 'Requested DevOps shift supervisor confirmation for August 14 deployment window.',
        stage: 'Under Investigation',
      },
      {
        date: new Date('2026-08-18T11:00:00Z'),
        actionBy: 'Pooja Nair (HR)',
        action: 'Comp-off Reconciled & Resolved',
        notes: 'Payroll records updated. 6 additional hours added to employee profile.',
        stage: 'Resolved',
      },
    ],
  },
  {
    grievanceId: 'GRV-2026-218',
    isAnonymous: true,
    filerName: 'Anonymous Whistleblower (Protected)',
    filerDepartment: 'Operations',
    filerEmail: '',
    category: 'Code of Conduct & Ethics',
    severity: 'High',
    subject: 'Potential Conflict of Interest in Secondary Vendor Selection Process',
    statement:
      'An external hardware vendor bidding for office monitor procurement appears to share close familial ties with an operations evaluation lead. Requesting ethics ombudsman independent audit before contract execution.',
    status: 'Under Investigation',
    assignedOfficer: {
      name: 'Ethics Ombudsman Council',
      role: 'Internal Audit Committee',
      assignedAt: new Date('2026-08-28'),
    },
    resolutionOutcome: '',
    auditTrail: [
      {
        date: new Date('2026-08-27T18:45:00Z'),
        actionBy: 'Encrypted Security Gateway',
        action: 'Whistleblower Report Lodged',
        notes: 'Anonymous submission encrypted with 256-bit token. Non-retaliation protections activated.',
        stage: 'Submitted',
      },
      {
        date: new Date('2026-08-29T09:30:00Z'),
        actionBy: 'Ethics Ombudsman Council',
        action: 'Procurement Bid Freeze Ordered',
        notes: 'Vendor RFP process placed on provisional 7-day hold pending independent procurement integrity review.',
        stage: 'Under Investigation',
      },
    ],
  },
  {
    grievanceId: 'GRV-2026-312',
    isAnonymous: false,
    filerName: 'Deepak Rao',
    filerDepartment: 'Design & UI',
    filerEmail: 'deepak.r@gotechedu.com',
    category: 'Equipment & Infrastructure',
    severity: 'Low',
    subject: 'Ergonomic Seating & Second Display Request for High-DPI UI Prototyping',
    statement:
      'Submitting infrastructure request for ergonomic chair replacement and high-fidelity 4K external display required for high-density design system sprints.',
    status: 'Action Taken',
    assignedOfficer: {
      name: 'Siddharth Sen',
      role: 'Facility & IT Infrastructure Manager',
      assignedAt: new Date('2026-09-02'),
    },
    resolutionOutcome:
      'Purchase order #PO-4091 approved. 4K Dell UltraSharp monitor and ergonomic mesh chair dispatched for workstation D-14.',
    resolvedAt: new Date('2026-09-04'),
    auditTrail: [
      {
        date: new Date('2026-09-01T11:20:00Z'),
        actionBy: 'Deepak Rao',
        action: 'Infrastructure Grievance Filed',
        notes: 'Request logged with design workstation specifications.',
        stage: 'Submitted',
      },
      {
        date: new Date('2026-09-04T16:00:00Z'),
        actionBy: 'Siddharth Sen (IT)',
        action: 'Equipment Ordered & Assigned',
        notes: 'PO approved by Department Head. Equipment delivery scheduled.',
        stage: 'Action Taken',
      },
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Upsert policies
    for (const p of initialPolicies) {
      await Policy.findOneAndUpdate({ policyCode: p.policyCode }, p, { upsert: true, new: true });
      console.log(`Seeded/Updated Policy: ${p.policyCode} - ${p.title}`);
    }

    // Upsert grievances
    for (const g of initialGrievances) {
      await Grievance.findOneAndUpdate({ grievanceId: g.grievanceId }, g, { upsert: true, new: true });
      console.log(`Seeded/Updated Grievance: ${g.grievanceId} - ${g.subject}`);
    }

    console.log('✅ Policy and Grievance seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
