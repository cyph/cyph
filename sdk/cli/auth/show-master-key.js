/* Temporary workaround for blessed/prompt bug that causes duplicate keystrokes */

import {_showMasterKey} from './index.js';

const args = process.argv.slice(2);

await _showMasterKey(args[0], args[1] === '--retry');

process.exit();
