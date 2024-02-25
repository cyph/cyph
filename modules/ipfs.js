#!/usr/bin/env node

import {util} from '@cyph/sdk';
import {unixfs as heliaUnixfs} from '@helia/unixfs';
import {BlackHoleBlockstore} from 'blockstore-core/black-hole';
import fs from 'fs/promises';
import {createHelia} from 'helia';
import {fixedSize} from 'ipfs-unixfs-importer/chunker';
import {balanced} from 'ipfs-unixfs-importer/layout';
import os from 'os';
import path from 'path';
import {fetch, FormData} from './fetch.js';

const {lockFunction, retryUntilSuccessful} = util;

const defaultCredentials = {
	pinata: await fs
		.readFile(path.join(os.homedir(), '.cyph', 'pinata.key'))
		.then(buf => buf.toString().trim())
		.catch(() => undefined)
};

const locks = {
	pinata: lockFunction()
};

const cloneBuffer = buf => {
	const stringInput = typeof buf === 'string';

	if (!(buf instanceof Buffer)) {
		buf = Buffer.from(buf);
	}
	if (stringInput) {
		return buf;
	}

	const bufCopy = Buffer.alloc(buf.length);
	buf.copy(bufCopy);
	return bufCopy;
};

/* https://github.com/ipfs/helia/issues/187#issuecomment-1667779190 */
const cidVersion = 0;
const ipfsOptions = {
	chunker: fixedSize({
		chunkSize: 262144
	}),
	cidVersion,
	layout: balanced({
		maxChildrenPerNode: 174
	}),
	rawLeaves: false
};

export const ipfs = heliaUnixfs(
	await createHelia({
		blockstore: new BlackHoleBlockstore(),
		start: false
	})
);

export const ipfsAdd = async (content, credentials = defaultCredentials) => {
	if (content === undefined) {
		throw new Error('Content to add to IPFS not defined.');
	}
	if (credentials?.pinata === undefined) {
		throw new Error('Missing IPFS pinning credentials.');
	}

	content = cloneBuffer(content);

	const hash = await ipfsCalculateHash(content);

	if (content.length < 1) {
		return hash;
	}

	await retryUntilSuccessful(async () => {
		const formData = new FormData();
		formData.append(
			'file',
			new Blob([content], {type: 'application/octet-stream'})
		);
		formData.append('pinataOptions', JSON.stringify({cidVersion}));

		const {IpfsHash: pinataHash} = await locks.pinata(async () =>
			fetch(
				'https://api.pinata.cloud/pinning/pinFileToIPFS',
				{
					body: formData,
					headers: {
						Authorization: `Bearer ${credentials.pinata}`
					},
					method: 'POST'
				},
				'json'
			)
		);

		if (pinataHash === hash) {
			return;
		}

		throw new Error(
			`Pinata hash mismatch. Expected: ${hash}. Actual: ${pinataHash}.`
		);
	});

	return hash;
};

export const ipfsCalculateHash = async content => {
	if (content === undefined) {
		throw new Error('Content to calculate to IPFS hash for not defined.');
	}

	content = cloneBuffer(content);

	return retryUntilSuccessful(async () =>
		(await ipfs.addBytes(content, ipfsOptions)).toV0().toString()
	);
};
