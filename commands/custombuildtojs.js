#!/usr/bin/env node


const fs			= require('fs');
const {customBuild}	= require('./custombuild');


(async () => {


const args			= {
	id: process.argv[2],
	outputPath: process.argv[3],
	before: process.argv[4],
	after: process.argv[5],
	version: process.argv[6]
};


const o	= customBuild(args.id, args.version);

fs.writeFileSync(
	`${args.outputPath}`,
	`${args.before.trim()}{${
		Object.keys(o).
			map(k => `${k}:${
				o[k] instanceof Uint8Array ?
					`new Uint8Array(${JSON.stringify(Array.from(o[k]))})` :
					JSON.stringify(o[k])
			}`).
			join(',')
	}}${args.after.trim()}`
);


})().catch(err => {
	console.error(err);
	process.exit(1);
});
