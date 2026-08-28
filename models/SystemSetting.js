const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'GoTechEdu Enterprises Pvt Ltd',
    },
    companyEmail: {
      type: String,
      default: 'admin@gotechedu.com',
    },
    companyPhone: {
      type: String,
      default: '+91 98765 43210',
    },
    companyAddress: {
      type: String,
      default: 'Cyber City Tech Tower, DLF Phase 2, Gurugram, Haryana - 122002',
    },
    currency: {
      type: String,
      default: 'INR (₹)',
    },
    taxSettings: {
      defaultTdsRate: { type: Number, default: 10 },
      pfEmployeeRate: { type: Number, default: 12 },
      pfEmployerRate: { type: Number, default: 12 },
      standardHraPercent: { type: Number, default: 40 },
    },
    notifications: {
      emailOnApplication: { type: Boolean, default: true },
      emailOnSalaryDisbursal: { type: Boolean, default: true },
      slackWebhookUrl: { type: String, default: '' },
    },
    rolesPermissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        superadmin: ['all'],
        admin: ['manage_employees', 'manage_payroll', 'manage_jobs', 'manage_courses', 'manage_blogs', 'view_recycle_bin'],
        hr: ['manage_employees', 'view_payroll', 'manage_jobs', 'manage_applications', 'manage_courses'],
        manager: ['view_team', 'approve_leaves', 'view_projects', 'assign_tasks'],
        teamlead: ['view_tasks', 'update_projects'],
        employee: ['view_self', 'apply_leaves', 'view_courses', 'view_blogs'],
      },
    },
    security: {
      twoFactorRequired: { type: Boolean, default: false },
      sessionTimeoutMinutes: { type: Number, default: 120 },
      passwordMinLength: { type: Number, default: 8 },
    },
  },
  {
    timestamps: true,
  }
);

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = { SystemSetting };
