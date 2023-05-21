#!/usr/bin/env node

import fastSHA512 from 'fast-sha512';
import fs from 'fs/promises';
import path from 'path';
import {fetch} from '../modules/fetch.js';

export const getSubresourceURL = subresourcePath =>
	new URL(
		subresourcePath.startsWith('//') ?
			`https:${subresourcePath}` :
			subresourcePath
	);

export const processSubresourcePath = subresourcePath => {
	try {
		getSubresourceURL(subresourcePath);
		return subresourcePath;
	}
	catch {
		return subresourcePath.split('?')[0].replace(/^\//, '');
	}
};

export const readSubresource = async ({
	allowRemoteSubresources = false,
	parentDirectory,
	subresourcePath
}) => {
	try {
		const fullSubresourcePath = parentDirectory ?
			path.join(parentDirectory, subresourcePath) :
			subresourcePath;

		return await fs.readFile(fullSubresourcePath);
	}
	catch (err) {
		if (!allowRemoteSubresources) {
			console.error(
				`ERROR: Cannot find subresource: ${subresourcePath}.\n`
			);
			throw err;
		}
	}

	try {
		console.warn(
			`WARNING: Attempting to download the following subresource: ${subresourcePath}. ` +
				`For production usage, you must move the file directly into this project.`
		);

		const url = getSubresourceURL(subresourcePath);
		const buf = Buffer.from(await fetch(url, undefined, 'arrayBuffer'));

		const sriHash = `sha512-${Buffer.from(
			await fastSHA512.hash(buf, true)
		).toString('base64')}`;

		console.warn(
			`Downloaded subresource ${subresourcePath} with hash ${sriHash}.\n`
		);

		return buf;
	}
	catch (err) {
		console.error(
			`ERROR: Failed to fetch subresource: ${subresourcePath}.\n`
		);
		throw err;
	}
};
