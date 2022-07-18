import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import childProcess from 'child_process';
import {demoAgsePublicSigningKeys} from './demo-agse-public-signing-keys.js';

childProcess.spawnSync('tsc', [
	`${__dirname}/../shared/js/cyph/account/agse-public-signing-keys.ts`
]);

export const {agsePublicSigningKeys} = {
	...(await import(
		`${__dirname}/../shared/js/cyph/account/agse-public-signing-keys.js`
	)),
	demo: demoAgsePublicSigningKeys
};
