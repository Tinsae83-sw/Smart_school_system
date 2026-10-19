const validators = require('./validators');
const errorHandler = require('./errorHandler');

module.exports = {
  ...validators,
  ...errorHandler
};
