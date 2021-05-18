#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import cyphPrettier from '@cyph/prettier';
import fs from 'fs';
import protobuf from 'protobufjs';
import {minify} from 'terser';

const rootPath = `${__dirname}/../shared/js/proto`;
const packageJSON = JSON.parse(
	fs.readFileSync(`${__dirname}/../package.json`).toString()
);

const prettier = code =>
	cyphPrettier.format(code, {...packageJSON.prettier, parser: 'babel'});

const getMessageTypesInternal = (o, parent) =>
	!o.nested ?
		[] :
		Object.entries(o.nested)
			.map(([k, v]) => [parent ? `${parent}.${k}` : k, v])
			.map(([k, v]) => [[k, v], ...getMessageTypesInternal(v, k)])
			.reduce((a, b) => a.concat(b), []);

const getMessageTypes = (o, typeMessage) =>
	getMessageTypesInternal(o)
		.filter(
			([_k, v]) =>
				v.__proto__.constructor.name === (typeMessage ? 'Type' : 'Enum')
		)
		.sort(([a], [b]) => (a > b ? 1 : -1));

const {root} = protobuf.parse(fs.readFileSync(`${__dirname}/../types.proto`));
const messageTypes = getMessageTypes(root, true);
const enumTypes = getMessageTypes(root, false);

const typesCode = `
/** Sets worker thread containing proto code. */
export const setProtoThread: (protoThread: {
	callProto: (key: string, method: string, arg?: any) => Promise<any>;
}) => void;
`;

let indexCode = `
	let protoThreadResolve;
	const protoThread = new Promise(resolve => {
		protoThreadResolve = resolve;
	});
	export const setProtoThread = protoThreadResolve;
`;

let workerWrapperCode = 'self.$root = $root; $root.protoMappings = {';

for (const [k] of messageTypes) {
	const messageDefinition = `${k} = {
		create: async () => (await protoThread).callProto('${k}', 'create'),
		decode: async bytes => (await protoThread).callProto('${k}', 'decode', bytes),
		encode: async data => (await protoThread).callProto('${k}', 'encode', data),
		verify: async data => (await protoThread).callProto('${k}', 'verify', data)
	};\n`;

	indexCode +=
		k.indexOf('.') > -1 ?
			messageDefinition :
			`export const ${messageDefinition}`;

	workerWrapperCode += `'${k}': $root.${k},`;
}

workerWrapperCode = `${workerWrapperCode.slice(0, -1)}};`;

for (const [k, v] of enumTypes) {
	const enumDefinition = `${k} = (() => {
		const valuesById = {};
		const values = Object.create(valuesById);
		${Object.entries(v.values)
			.map(
				([enumKey, enumValue]) =>
					`values[valuesById[${enumValue}] = "${enumKey}"] = ${enumValue};`
			)
			.join('\n')}
		return values;
	})();\n`;

	indexCode +=
		k.indexOf('.') > -1 ? enumDefinition : `export const ${enumDefinition}`;
}

fs.writeFileSync(
	`${rootPath}/worker.js`,
	fs
		.readFileSync('/node_modules/protobufjs/dist/minimal/protobuf.min.js')
		.toString() +
		'\nvar $protobuf = protobuf;\n' +
		(
			await minify(
				fs
					.readFileSync(`${rootPath}/index.js`)
					.toString()
					.split('"use strict";')[1]
					.split('return $root;')[0] + workerWrapperCode
			)
		).code
);

fs.writeFileSync(`${rootPath}/index.js`, prettier(indexCode));
fs.appendFileSync(`${rootPath}/types.d.ts`, typesCode);
