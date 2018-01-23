#!/usr/bin/env node


const fs	= require('fs');
const glob	= require('glob');
const path	= require('path');


const translations	= glob.sync(path.join(__dirname, '..', 'translations', '*.json')).
	map(file => ({
		key: file.split("/").slice(-1)[0].split(".")[0].toLowerCase(),
		value: JSON.parse(fs.readFileSync(file).toString())
	})).
	reduce(
		(translations, o) => {
			translations[o.key]	= o.value;
			return translations;
		},
		{}
	)
;


if (require.main) {
	console.log(JSON.stringify(translations));
}
else {
	module.exports	= {translations};
}
