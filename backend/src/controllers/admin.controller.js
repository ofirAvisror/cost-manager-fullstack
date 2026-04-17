const adminService = require('../services/admin.service');
const { logger } = require('../config/logger');

/**
 * Get team members
 */
function getAbout(req, res) {
  try {
    const teamMembers = adminService.getTeamMembers();
    res.json(teamMembers);
  } catch (error) {
    logger.error('Error in about endpoint:', error.message);
    res.status(500).json({ 
      id: 'SERVER_ERROR',
      message: error.message 
    });
  }
}

module.exports = {
  getAbout
};



