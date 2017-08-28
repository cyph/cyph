#!/usr/bin/env node


const fs			= require('fs');
const mkdirp		= require('mkdirp');
const sign			= require('../sign');


(async () => {


const args			= {
	hashWhitelist: JSON.parse(process.argv[2]),
	items: process.argv.slice(3).filter(s => s)
};


const signatureTTL	= 2.5; // Months
const timestamp		= Date.now();

const items			= args.items.map(s => s.split('=')).map(arr => ({
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
	const {rsaIndex, signedItems, sphincsIndex}	= await sign(
		items.map(({additionalData, message}) => ({additionalData, message}))
	);

	for (let i = 0 ; i < items.length ; ++i) {
		const outputDir	= items[i].outputDir;

		await new Promise(resolve => mkdirp(outputDir, resolve));

		fs.writeFileSync(`${outputDir}/current`, timestamp);

		fs.writeFileSync(`${outputDir}/pkg`,
			signedItems[i] + '\n' +
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
