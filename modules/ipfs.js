#!/usr/bin/env node

import {util} from '@cyph/sdk';
import fs from 'fs/promises';
import {MemoryDatastore} from 'interface-datastore';
import * as IPFS from 'ipfs-core';
import ipfsRepo from 'ipfs-repo';
import * as rawCodec from 'multiformats/codecs/raw';
import os from 'os';
import path from 'path';
import {fetch, FormData} from './fetch.js';

const {
	createRepo,
	locks: {memory: memoryLock}
} = ipfsRepo;
const {retryUntilSuccessful} = util;

const defaultCredentials = {
	eternum: await fs
		.readFile(path.join(os.homedir(), '.cyph', 'eternum.key'))
		.then(buf => buf.toString().trim())
		.catch(() => undefined),
	pinata: await fs
		.readFile(path.join(os.homedir(), '.cyph', 'pinata.key'))
		.then(buf => buf.toString().trim())
		.catch(() => undefined)
};

export const ipfs = await IPFS.create({
	repo: createRepo(
		'/dev/null',
		() => rawCodec,
		{
			blocks: new MemoryDatastore(),
			datastore: new MemoryDatastore(),
			keys: new MemoryDatastore(),
			pins: new MemoryDatastore(),
			root: new MemoryDatastore()
		},
		{autoMigrate: false, repoLock: memoryLock, repoOwner: true}
	)
});

export const ipfsAdd = async (content, credentials = defaultCredentials) => {
	content = typeof content === 'string' ? Buffer.from(content) : content;

	if (content === undefined) {
		throw new Error('Content to add to IPFS not defined.');
	}

	if (
		credentials?.eternum === undefined ||
		credentials?.pinata === undefined
	) {
		throw new Error('Missing IPFS pinning credentials.');
	}

	const hash = await retryUntilSuccessful(async () =>
		(await ipfs.add(content, {cidVersion: 0})).cid.toString()
	);

	await retryUntilSuccessful(async () => {
		const formData = new FormData();
		formData.append('file', content);
		formData.append('pinataOptions', JSON.stringify({cidVersion: 0}));

		const {IpfsHash: pinataHash} = await fetch(
			'https://api.pinata.cloud/pinning/pinFileToIPFS',
			{
				headers: {
					Authorization: `Bearer ${credentials.pinata}`
				},
				method: 'POST'
			}
		).then(o => o.json());

		if (pinataHash === hash) {
			return;
		}

		throw new Error(
			`Pinata hash mismatch. Expected: ${hash}. Actual: ${pinataHash}.`
		);
	});

	await retryUntilSuccessful(async () =>
		fetch('https://www.eternum.io/api/pin/', {
			body: JSON.stringify({hash}),
			headers: {
				'Authorization': `Bearer ${credentials.eternum}`,
				'Content-Type': 'application/json'
			},
			method: 'POST'
		})
	);

	return hash;
};
