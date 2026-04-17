const { logger } = require('../config/logger');

/**
 * Team members data
 */
const teamMembers = [
  {
    first_name: 'Gal',
    last_name: 'Aviv'
  },
  {
    first_name: 'Bar',
    last_name: 'Bibi'
  },
  {
    first_name: 'Ofir',
    last_name: 'Avisror'
  }
];

/**
 * Get team members
 */
function getTeamMembers() {
  return teamMembers;
}

module.exports = {
  getTeamMembers
};



