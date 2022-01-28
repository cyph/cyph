#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import fs from 'fs';
import {customBuild} from './custombuild.js';

(async () => {
	const args = {
		id: process.argv[2],
		baseEnvironment: process.argv[3],
		version: process.argv[4],
		noLockDown: process.argv[5] === '--no-lock-down'
	};

	const o = customBuild(args.id, args.version);

	if (o.preLoadCSS) {
		o.css = o.preLoadCSS(o.css);
		delete o.preLoadCSS;
	}

	const baseEnvironment = (args.baseEnvironment || 'local').replace(
		/[A-Z]/,
		s => `-${s.toLowerCase()}`
	);
	if (args.noLockDown && o.config) {
		o.config.lockedDown = false;
	}

	fs.writeFileSync(
		`${__dirname}/../shared/js/environments/.environment.tmp.ts`,
		`
			/* tslint:disable */
			import {environment} from './environment.${baseEnvironment}';


			environment.envName = 'tmp';
			environment.local = true;

			environment.customBuild = {${Object.keys(o)
				.map(
					k =>
						`${k}:${
							o[k] instanceof Uint8Array ?
								`new Uint8Array(${JSON.stringify(
									Array.from(o[k])
								)})` :
								JSON.stringify(o[k])
						}`
				)
				.join(',')}};

			export {environment};
		`.trim()
	);

	process.exit(0);
})().catch(err => {
	console.error(err);
	process.exit(1);
});
