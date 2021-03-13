import sodium from 'libsodium-wrappers-sumo';

global.sodium = sodium;

import './buildunbundledassets.js';
import '../shared/assets/js/standalone/global.js';
import '../shared/assets/js/cyph/crypto/potassium.js';

export const potassium = new Potassium();
export default potassium;

global.Index = undefined;
