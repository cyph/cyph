#!/usr/bin/env node

/**
 * @file Temporarily reverted to old implementation pending resolution of
 * https://github.com/ipfs/helia/issues/187.
 */

import {util} from '@cyph/sdk';
import {MemoryDatastore as MemoryDatastoreInternal} from 'datastore-core';
import fs from 'fs/promises';
import * as IPFS from 'ipfs-core';
import {createRepo} from 'ipfs-repo';
import {MemoryLock} from 'ipfs-repo/locks/memory';
import * as rawCodec from 'multiformats/codecs/raw';
import os from 'os';
import path from 'path';
import {fetch, FormData} from './fetch.js';

class MemoryDatastore extends MemoryDatastoreInternal {
	async open () {}
}

const {lockFunction, retryUntilSuccessful} = util;

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

const locks = {
	eternum: lockFunction(),
	pinata: lockFunction()
};

const cloneBuffer = buf => {
	const bufCopy = Buffer.alloc(buf.length);
	buf.copy(bufCopy);
	return bufCopy;
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
		{autoMigrate: false, repoLock: MemoryLock, repoOwner: true}
	)
});

export const ipfsAdd = async (content, credentials = defaultCredentials) => {
	content = typeof content === 'string' ? Buffer.from(content) : content;

	if (!(content instanceof Buffer)) {
		throw new Error('Content to add to IPFS not defined.');
	}

	if (
		credentials?.eternum === undefined ||
		credentials?.pinata === undefined
	) {
		throw new Error('Missing IPFS pinning credentials.');
	}

	const hash = await retryUntilSuccessful(async () =>
		(await ipfs.add(cloneBuffer(content), {cidVersion: 0})).cid.toString()
	);

	if (content.length < 1) {
		return hash;
	}

	await retryUntilSuccessful(async () => {
		const formData = new FormData();
		formData.append(
			'file',
			new Blob([cloneBuffer(content)], {type: 'application/octet-stream'})
		);
		formData.append('pinataOptions', JSON.stringify({cidVersion: 0}));

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

	await retryUntilSuccessful(async () =>
		locks.eternum(async () =>
			fetch('https://www.eternum.io/api/pin', {
				body: JSON.stringify({hash}),
				headers: {
					'Authorization': `Token ${credentials.eternum}`,
					'Content-Type': 'application/json'
				},
				method: 'POST'
			})
		)
	);

	return hash;
};

export const ipfsCalculateHash = async content => {
	content = typeof content === 'string' ? Buffer.from(content) : content;

	if (content === undefined) {
		throw new Error('Content to calculate to IPFS hash for not defined.');
	}

	return retryUntilSuccessful(async () =>
		(
			await ipfs.add(content, {cidVersion: 0, onlyHash: true})
		).cid.toString()
	);
};
