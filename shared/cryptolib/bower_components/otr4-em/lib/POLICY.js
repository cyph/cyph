/** The available values used for the policy parameter of an otr.Session
 *
 *  @alias module:otr.POLICY
 *  @readonly
 *  @enum {number}
 */
var POLICY = module.exports = {
	'NEVER': 0x00,
	'ALLOW_V1': 0x01,
	'ALLOW_V2': 0x02,
	'ALLOW_V3': 0x04,
	'REQUIRE_ENCRYPTION': 0x08,
	'SEND_WHITESPACE_TAG': 0x10,
	'WHITESPACE_START_AKE': 0x20,
	'ERROR_START_AKE': 0x40,
	/** ALLOW_V1 | ALLOW_V2 | ALLOW_V3 */
	'VERSION_MASK': 0x01 | 0x02 | 0x04,
	/** VERSION_MASK | SEND_WHITESPACE_TAG | WHITESPACE_START_AKE | ERROR_START_AKE */
	'OPPORTUNISTIC': 0x01 | 0x02 | 0x04 | 0x10 | 0x20 | 0x40,
	/** VERSION_MASK */
	'MANUAL': 0x01 | 0x02 | 0x04,
	/** VERSION_MASK | REQUIRE_ENCRYPTION | WHITESPACE_START_AKE | ERROR_START_AKE */
	'ALWAYS': 0x01 | 0x02 | 0x04 | 0x08 | 0x20 | 0x40,
	/** OPPORTUNISTIC */
	'DEFAULT': 0x01 | 0x02 | 0x04 | 0x10 | 0x20 | 0x40
};
