/**
 * Jest runs cleanup that calls User.deleteMany({}) etc.
 * Without a dedicated URI, tests fall back to MONGO_URI and wipe dev data.
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.MONGO_URI_TEST || !String(process.env.MONGO_URI_TEST).trim()) {
  throw new Error(
    'Refusing to run tests: MONGO_URI_TEST is not set.\n' +
      'Tests delete all users/costs after each case. They must use a separate Mongo database from MONGO_URI.\n' +
      'Add to backend/.env for example:\n' +
      '  MONGO_URI_TEST=mongodb+srv://.../cost_manager_test\n' +
      'Or the same cluster with a different database name than production/dev.'
  );
}
