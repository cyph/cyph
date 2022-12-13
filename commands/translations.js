#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

export const translations = (
	await glob(path.join(__dirname, '..', 'translations', '*.json'))
)
	.map(file => ({
		key: file.split('/').slice(-1)[0].split('.')[0].toLowerCase(),
		value: JSON.parse(fs.readFileSync(file).toString())
	}))
	.reduce((translations, o) => {
		translations[o.key] = o.value;
		return translations;
	}, {});

if (isCLI) {
	console.log(JSON.stringify(translations));
	process.exit(0);
}
