require('child_process').spawnSync('bash', ['../commands/buildunbundledassets.sh', '--test']);
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/proto');

module.exports	= Index;
global.Index	= undefined;
