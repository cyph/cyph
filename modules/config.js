import './buildunbundledassets.js';
import '../shared/assets/js/standalone/global.js';
import '../shared/assets/js/cyph/config.js';
import '../shared/assets/js/cyph/plan-config.js';

const config = new Config();
config.config = config;
config.planConfig = planConfig;
export {config, planConfig};
export default config;

global.Config = undefined;
global.planConfig = undefined;
