#!/usr/bin/env node

import {proto, util, webSignService} from '@cyph/sdk';
import fs from 'fs/promises';
import glob from 'glob';
import path from 'path';
import {useLicenseKey} from '../auth/index.js';
import {pack} from './pack.js';
import {subresourceInline} from './subresource-inline.js';
import {threadPack} from './thread-pack.js';

const {WebSignKeyPersistence} = proto;
const {getTimestamp} = util;

const rootOutputPath = '.websign-deployment-pkg';
const subresourcesOutputPath = `${webSignOutputPath}-subresources`;

export const deploy = async ({
	mandatoryUpdate = false,
	packageName,
	requiredUserSignatures = [],
	rootDirectoryPath,
	tofuKeyPersistence = false,
	ttlMonths = 18
}) => {
	const timestamp = await getTimestamp();

	if (!rootDirectoryPath) {
		throw new Error('Missing root directory path.');
	}
	if (!packageName) {
		packageName = path.parse(rootDirectoryPath).base;
	}

	await useLicenseKey();

	const rootOutputPathFull = path.join(rootDirectoryPath, rootOutputPath);
	const subresourcesOutputPathFull = path.join(
		rootDirectoryPath,
		subresourcesOutputPath
	);

	for (const dir of [rootOutputPathFull, subresourcesOutputPathFull]) {
		try {
			await fs.unlink(dir);
		}
		catch {}
	}

	await subresourceInline(rootDirectoryPath, subresourcesOutputPath);

	for (const scriptPath of glob.sync(
		path.join(rootDirectoryPath, '**', '*.js'),
		{nodir: true}
	)) {
		await threadPack(scriptPath);
	}

	await pack(rootDirectoryPath, 'index.html', true, true, rootOutputPath);

	await webSignService.submitRelease(
		{
			expirationTimestamp: timestamp + ttlMonths * 2.628e9,
			keyPersistence: tofuKeyPersistence ?
				WebSignKeyPersistence.TOFU :
				WebSignKeyPersistence.Default,
			mandatoryUpdate,
			packageName,
			payload: (await fs.readFile(rootOutputPathFull)).toString(),
			requiredUserSignatures,
			timestamp
		},
		{
			subresources: Object.fromEntries(
				await Promise.all(
					glob
						.sync(path.join(subresourcesOutputPathFull, '**'), {
							ignore: '**/*.srihash',
							nodir: true
						})
						.map(async subresource => [
							subresource.slice(
								subresourcesOutputPathFull.length + 1
							),
							(await fs.readFile(subresource)).toString()
						])
				)
			)
		}
	);
};
