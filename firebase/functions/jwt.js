const jwt = require('jsonwebtoken');
const util = require('util');

module.exports = {
	...jwt,
	decode: util.promisify(jwt.decode),
	sign: util.promisify(jwt.sign),
	verify: util.promisify(jwt.verify)
};
