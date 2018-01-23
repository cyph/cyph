#!/usr/bin/env node


const fs			= require('fs');
const {customBuild}	= require('./custombuild');


(async () => {


const args			= {
	id: process.argv[2],
	baseEnvironment: process.argv[3],
	version: process.argv[4]
};


const o	= customBuild(args.id, args.version);

const baseEnvironment	=
	(args.baseEnvironment || 'local').replace(/[A-Z]/, s => `-${s.toLowerCase()}`)
;

fs.writeFileSync(
	`${__dirname}/../shared/js/environments/.environment.tmp.ts`,
	`
		/* tslint:disable */
		import {environment} from './environment.${baseEnvironment}';


		environment.envName	= 'tmp';
		environment.local	= true;

		environment.customBuild	= {${
			Object.keys(o).
				map(k => `${k}:${
					o[k] instanceof Uint8Array ?
						`new Uint8Array(${JSON.stringify(Array.from(o[k]))})` :
						JSON.stringify(o[k])
				}`).
				join(',')
		}};

		export {environment};
	`.trim()
);


})().catch(err => {
	console.error(err);
	process.exit(1);
});
