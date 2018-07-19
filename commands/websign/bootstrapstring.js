#!/usr/bin/env node


const fs		= require('fs');
const {pack}	= require('./pack');


const bootstrapString	= async () => {
	const path	= `${__dirname}/../../websign`;

	const index	= await pack(path, 'index.html');

	const files	= JSON.parse(
		fs.readFileSync(`${path}/js/config.js`).toString().
			replace(/\s+/g, ' ').
			replace(/.*files:\s+(\[.*?\]),.*/, '$1').
			replace(/'/g, '"')
	);

	return files.
		map(file => {
			return file + ':\n\n' + (
				file === '/' ?
					index :
					fs.readFileSync(`${path}/${
						file === '/unsupportedbrowser' ?
							'unsupportedbrowser.html' :
							file
					}`).toString().trim()
			);
		}).
		join('\n\n\n\n\n\n')
	;
};


if (require.main === module) {
	bootstrapString().then(content => {
		console.log(content);
	}).catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {bootstrapString};
}
