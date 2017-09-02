#!/usr/bin/env node


const fs			= require('fs');
const mkdirp		= require('mkdirp');
const {sign}		= require('../sign');


(async () => {


const args			= {
	hashWhitelist: JSON.parse(process.argv[2]),
	inputs: process.argv.slice(3).filter(s => s)
};


const signatureTTL	= 2.5; // Months
const timestamp		= Date.now();

const inputs		= args.inputs.map(s => s.split('=')).map(arr => ({
	additionalData: {none: true},
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
		inputs.map(({additionalData, message}) => ({additionalData, message}))
	);

	for (let i = 0 ; i < inputs.length ; ++i) {
		const outputDir	= inputs[i].outputDir;

		await new Promise(resolve => mkdirp(outputDir, resolve));

		fs.writeFileSync(`${outputDir}/current`, timestamp);

		fs.writeFileSync(`${outputDir}/pkg`,
			signedInputs[i] + '\n' +
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


})();
