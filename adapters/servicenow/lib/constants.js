/**
 * ServiceNow adapter constants.
 */

// install_status value mappings (ServiceNow uses integers)
const INSTALL_STATUS = {
  'Active': '1',
  'Retired': '7',
  'In Development': '2',
  'In Maintenance': '6',
  'Absent': '100',
  'Installed': '1',
  'On Order': '101',
  'In Stock': '102',
  'In Transit': '103',
};

module.exports = { INSTALL_STATUS };
