global.crypto	= require('crypto');
global.sodium	= require('libsodium-wrappers-sumo');

require('./js/standalone/global');
require('./js/cyph/crypto/potassium');

const potassium		= new Potassium();
potassium.potassium	= potassium;

module.exports	= potassium;
global.Index	= undefined;
