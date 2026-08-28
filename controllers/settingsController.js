const { SystemSetting } = require('../models/SystemSetting');

/**
 * GET /api/settings
 * Retrieve or initialize system settings
 */
const getSettings = async (req, res) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting({});
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('[Settings Controller] getSettings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system settings',
      error: error.message,
    });
  }
};

/**
 * PUT /api/settings
 * Update system settings
 */
const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting(updates);
    } else {
      Object.assign(settings, updates);
    }
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('[Settings Controller] updateSettings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update system settings',
      error: error.message,
    });
  }
};

/**
 * PUT /api/settings/permissions
 * Update role permission matrix specifically
 */
const updatePermissions = async (req, res) => {
  try {
    const { rolesPermissions } = req.body;
    if (!rolesPermissions) {
      return res.status(400).json({ success: false, message: 'rolesPermissions object is required' });
    }

    let settings = await SystemSetting.findOne();
    if (!settings) settings = new SystemSetting({});

    settings.rolesPermissions = rolesPermissions;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Role permissions matrix updated successfully',
      rolesPermissions: settings.rolesPermissions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update permissions',
      error: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  updatePermissions,
};
