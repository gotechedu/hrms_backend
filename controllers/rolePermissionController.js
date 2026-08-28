const { Role } = require('../models/Role');
const { Permission } = require('../models/Permission');
const { User } = require('../models/User');

/**
 * GET /api/roles
 * List all roles with dynamically aggregated user counts
 */
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ priority: 1, createdAt: 1 });

    // Aggregate user count for each role slug
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role.slug });
        return {
          _id: role._id,
          id: role.slug,
          slug: role.slug,
          name: role.name,
          description: role.description,
          badgeColor: role.badgeColor,
          isSystem: role.isSystem,
          permissions: role.permissions,
          priority: role.priority,
          userCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: rolesWithCounts.length,
      roles: rolesWithCounts,
    });
  } catch (error) {
    console.error('[Role Controller] getRoles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message,
    });
  }
};

/**
 * POST /api/roles
 * Create a new custom organizational role
 */
const createRole = async (req, res) => {
  try {
    const { name, slug, description, badgeColor, permissions, priority } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required',
      });
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!generatedSlug) {
      return res.status(400).json({
        success: false,
        message: 'Valid role identifier or name is required',
      });
    }

    const existingRole = await Role.findOne({ slug: generatedSlug });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: `Role with identifier '${generatedSlug}' already exists`,
      });
    }

    const role = await Role.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description || '',
      badgeColor: badgeColor || 'bg-cyan-50 text-cyan-700 border-cyan-200',
      isSystem: false,
      permissions: Array.isArray(permissions) ? permissions : ['attendance', 'courses'],
      priority: priority || 10,
    });

    return res.status(201).json({
      success: true,
      message: `Role '${role.name}' created successfully`,
      role: {
        _id: role._id,
        id: role.slug,
        slug: role.slug,
        name: role.name,
        description: role.description,
        badgeColor: role.badgeColor,
        isSystem: role.isSystem,
        permissions: role.permissions,
        userCount: 0,
      },
    });
  } catch (error) {
    console.error('[Role Controller] createRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message,
    });
  }
};

/**
 * GET /api/roles/:id
 * Get single role details
 */
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = (await Role.findById(id).catch(() => null)) || (await Role.findOne({ slug: id }));

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const userCount = await User.countDocuments({ role: role.slug });

    return res.status(200).json({
      success: true,
      role: {
        ...role.toObject(),
        id: role.slug,
        userCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve role',
      error: error.message,
    });
  }
};

/**
 * PUT /api/roles/:id
 * Update role metadata & assigned permissions
 */
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, badgeColor, permissions, priority } = req.body;

    const role = (await Role.findById(id).catch(() => null)) || (await Role.findOne({ slug: id }));

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    if (name && name.trim()) role.name = name.trim();
    if (description !== undefined) role.description = description;
    if (badgeColor) role.badgeColor = badgeColor;
    if (priority !== undefined) role.priority = priority;
    if (Array.isArray(permissions)) {
      // Superadmin always retains all permissions
      if (role.slug === 'superadmin') {
        const allPerms = await Permission.find().select('slug');
        role.permissions = allPerms.map((p) => p.slug);
      } else {
        role.permissions = permissions;
      }
    }

    await role.save();

    const userCount = await User.countDocuments({ role: role.slug });

    return res.status(200).json({
      success: true,
      message: `Role '${role.name}' updated successfully`,
      role: {
        ...role.toObject(),
        id: role.slug,
        userCount,
      },
    });
  } catch (error) {
    console.error('[Role Controller] updateRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/roles/:id
 * Delete custom role
 */
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = (await Role.findById(id).catch(() => null)) || (await Role.findOne({ slug: id }));

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: `System core role '${role.name}' cannot be deleted.`,
      });
    }

    // Check if any users currently have this role
    const assignedUsers = await User.countDocuments({ role: role.slug });
    if (assignedUsers > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role '${role.name}' because ${assignedUsers} user(s) are currently assigned to it. Please reassign those users first.`,
      });
    }

    await Role.findByIdAndDelete(role._id);

    return res.status(200).json({
      success: true,
      message: `Role '${role.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('[Role Controller] deleteRole error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message,
    });
  }
};

/**
 * PUT /api/roles/:id/permissions
 * Assign specific permissions list to a role
 */
const assignRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array of permission keys/slugs',
      });
    }

    const role = (await Role.findById(id).catch(() => null)) || (await Role.findOne({ slug: id }));
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    if (role.slug === 'superadmin') {
      const allPerms = await Permission.find().select('slug');
      role.permissions = allPerms.map((p) => p.slug);
    } else {
      role.permissions = permissions;
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: `Permissions for role '${role.name}' updated successfully`,
      role: {
        id: role.slug,
        slug: role.slug,
        name: role.name,
        permissions: role.permissions,
      },
    });
  } catch (error) {
    console.error('[Role Controller] assignRolePermissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign permissions',
      error: error.message,
    });
  }
};

/**
 * GET /api/permissions
 * List all registered permission modules & capabilities
 */
const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: permissions.length,
      permissions: permissions.map((p) => ({
        _id: p._id,
        id: p.slug,
        slug: p.slug,
        name: p.name,
        module: p.module,
        description: p.description,
        actions: p.actions,
        isSystem: p.isSystem,
        order: p.order,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message,
    });
  }
};

/**
 * POST /api/permissions
 * Create a new permission capability
 */
const createPermission = async (req, res) => {
  try {
    const { name, permission: permKeyInput, slug, module: permModule, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Permission name is required',
      });
    }

    const permKey = (permKeyInput || slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const moduleName = (permModule || 'general')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const existingPerm = await Permission.findOne({
      $or: [{ permission: permKey }, { slug: permKey }],
    });

    if (existingPerm) {
      return res.status(400).json({
        success: false,
        message: `Permission with key '${permKey}' already exists in module '${existingPerm.module}'`,
      });
    }

    const newPermission = await Permission.create({
      name: name.trim(),
      permission: permKey,
      slug: permKey,
      module: moduleName,
      description: description || '',
    });

    // Automatically add new permission to superadmin if superadmin exists
    await Role.findOneAndUpdate(
      { slug: 'superadmin' },
      { $addToSet: { permissions: newPermission.permission } }
    );

    return res.status(201).json({
      success: true,
      message: `Permission '${newPermission.name}' created in module '${newPermission.module}' successfully`,
      permission: {
        _id: newPermission._id,
        id: newPermission.permission,
        slug: newPermission.permission,
        permission: newPermission.permission,
        name: newPermission.name,
        module: newPermission.module,
        description: newPermission.description,
      },
    });
  } catch (error) {
    console.error('[Role Controller] createPermission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create permission',
      error: error.message,
    });
  }
};

/**
 * GET /api/permissions/matrix
 * Get complete Role-Permission matrix representation
 */
const getPermissionMatrix = async (req, res) => {
  try {
    const [roles, permissions] = await Promise.all([
      Role.find().sort({ priority: 1, createdAt: 1 }),
      Permission.find().sort({ order: 1, createdAt: 1 }),
    ]);

    // Build matrix: { [roleSlug]: { [permissionSlug]: boolean } }
    const matrix = {};
    roles.forEach((role) => {
      matrix[role.slug] = {};
      permissions.forEach((perm) => {
        if (role.slug === 'superadmin') {
          matrix[role.slug][perm.slug] = true;
        } else {
          matrix[role.slug][perm.slug] = role.permissions.includes(perm.slug);
        }
      });
    });

    return res.status(200).json({
      success: true,
      roles: roles.map((r) => ({
        _id: r._id,
        id: r.slug,
        slug: r.slug,
        name: r.name,
        badgeColor: r.badgeColor,
        isSystem: r.isSystem,
      })),
      permissions: permissions.map((p) => ({
        _id: p._id,
        id: p.slug,
        slug: p.slug,
        name: p.name,
        module: p.module,
        description: p.description,
      })),
      matrix,
    });
  } catch (error) {
    console.error('[Role Controller] getPermissionMatrix error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate permission matrix',
      error: error.message,
    });
  }
};

/**
 * PUT /api/permissions/matrix
 * Batch update permissions matrix for all or selected roles
 */
const updatePermissionMatrix = async (req, res) => {
  try {
    const { matrix } = req.body;

    if (!matrix || typeof matrix !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Permission matrix object is required',
      });
    }

    const allPermissions = await Permission.find().select('slug');
    const allPermSlugs = allPermissions.map((p) => p.slug);

    for (const [roleSlug, permMap] of Object.entries(matrix)) {
      if (roleSlug === 'superadmin') {
        // Superadmin always has all permissions
        await Role.findOneAndUpdate(
          { slug: 'superadmin' },
          { permissions: allPermSlugs }
        );
        continue;
      }

      // Collect slugs where value is true
      const activePerms = Object.entries(permMap)
        .filter(([_, isAllowed]) => Boolean(isAllowed))
        .map(([permSlug]) => permSlug);

      await Role.findOneAndUpdate(
        { slug: roleSlug },
        { permissions: activePerms }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Permission matrix saved and applied successfully',
    });
  } catch (error) {
    console.error('[Role Controller] updatePermissionMatrix error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update permission matrix',
      error: error.message,
    });
  }
};

module.exports = {
  getRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  assignRolePermissions,
  getPermissions,
  createPermission,
  getPermissionMatrix,
  updatePermissionMatrix,
};
