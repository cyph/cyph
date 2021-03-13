import sodium from 'libsodium-wrappers-sumo';

global.sodium = sodium;

import './js/standalone/global.js';
import './js/cyph/crypto/potassium.js';

export const potassium = new Potassium();
export default potassium;

global.Index = undefined;
