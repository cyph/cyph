#!/usr/bin/env node


const fs			= require('fs');
const mkdirp		= require('mkdirp');
const sign			= require('./sign');


(async () => {


const args			= {
	hashWhitelist: JSON.parse(process.argv[2]),
	items: process.argv.slice(3).filter(s => s)
};


const signatureTTL	= 2.5; // Months
const timestamp		= Date.now();

const items			= args.items.map(s => s.split('=')).map(arr => ({
	outputDir: arr[1],
	inputData: JSON.stringify({
		timestamp,
		expires: timestamp + signatureTTL * 2.628e+9,
		hashWhitelist: args.hashWhitelist,
		package: fs.readFileSync(arr[0]).toString().trim(),
		packageName: arr[1].split('/').slice(-1)[0]
	})
}));


try {
	const {rsaIndex, signedItems, sphincsIndex}	= await sign(items.map(o => o.inputData));

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
catch (_) {
	console.log('Code signing failed.');
	process.exit(1);
}


})();
