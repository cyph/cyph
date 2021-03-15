#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {mangleExceptions} from '../scripts/mangleexceptions.js';

export {mangleExceptions};

if (isCLI) {
	console.log(JSON.stringify(mangleExceptions));
	process.exit(0);
}
