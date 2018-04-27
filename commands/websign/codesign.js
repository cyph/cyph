#!/usr/bin/env node


const fs			= require('fs');
const mkdirp		= require('mkdirp');
const {sign}		= require('../sign');


(async () => {


const argv			= process.argv.slice(2).filter(s => s && s !== '--test');

const args			= {
	hashWhitelist: JSON.parse(argv[0]),
	inputs: argv.slice(1),
	test: process.argv.indexOf('--test') > -1
};


const signatureTTL	= 2.5; // Months
const timestamp		= Date.now();

const inputs		= args.inputs.map(s => s.split('=')).map(arr => ({
	message: JSON.stringify({
		timestamp,
		expires: timestamp + signatureTTL * 2.628e+9,
		hashWhitelist: args.hashWhitelist,
		package: fs.readFileSync(arr[0]).toString().trim(),
		packageName: arr[1].split('/').slice(-1)[0]
	}),
	outputDir: arr[1]
}));


try {
	const {rsaIndex, signedInputs, sphincsIndex}	= await sign(
		inputs.map(({message}) => ({message})),
		args.test
	);

	for (let i = 0 ; i < inputs.length ; ++i) {
		const outputDir	= inputs[i].outputDir;

		await new Promise(resolve => mkdirp(outputDir, resolve));

		fs.writeFileSync(`${outputDir}/current`, timestamp);

		fs.writeFileSync(`${outputDir}/pkg`,
			signedInputs[i].toString('base64').replace(/\s+/g, '') + '\n' +
			rsaIndex + '\n' +
			sphincsIndex
		);

		console.log(`${outputDir} saved.`);
	}

	console.log('Code signing complete.');
	process.exit(0);
}
catch (err) {
	console.error(err);
	console.log('Code signing failed.');
	process.exit(1);
}


})().catch(err => {
	console.error(err);
	process.exit(1);
});
