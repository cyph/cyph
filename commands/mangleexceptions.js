#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {mangleExceptions as mangleExceptionsInternal} from '../scripts/mangleexceptions.js';

export const mangleExceptions = mangleExceptionsInternal;

if (isCLI) {
	console.log(JSON.stringify(mangleExceptions));
}
