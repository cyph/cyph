#!/usr/bin/env node

import {proto, util, webSignService} from '../../index.js';
import fs from 'fs/promises';
import {glob} from 'glob';
import path from 'path';
import {login} from '../auth/index.js';
import {pack} from './pack.js';
import {subresourceInline} from './subresource-inline.js';
import {threadPack} from './thread-pack.js';

const {WebSignKeyPersistence} = proto;
const {getTimestamp} = util;

const rootOutputPath = '.websign-deployment-pkg';
const outputHTMLPath = path.join(rootOutputPath, '.index.html');

export const deploy = async ({
	allowRemoteSubresources = false,
	keepBuildArtifacts = false,
	mandatoryUpdate = false,
	masterKey,
	packageName,
	requiredUserSignatures = [],
	rootDirectoryPath,
	tofuKeyPersistence = false,
	ttlMonths = 18,
	username
}) => {
	const timestamp = await getTimestamp();

	if (!rootDirectoryPath) {
		throw new Error('Missing root directory path.');
	}
	if (!packageName) {
		packageName = path.parse(rootDirectoryPath).base;
	}

	await login(username, masterKey);

	const rootOutputPathFull = path.join(rootDirectoryPath, rootOutputPath);
	const outputHTMLPathFull = path.join(rootDirectoryPath, outputHTMLPath);

	await fs.rm(rootOutputPathFull, {force: true, recursive: true});

	await subresourceInline(rootDirectoryPath, rootOutputPath);

	for (const scriptPath of await glob(
		path.join(rootDirectoryPath, '**', '*.js'),
		{nodir: true}
	)) {
		await threadPack(scriptPath);
	}

	await pack({
		allowRemoteSubresources,
		enableMinify: true,
		enableSRI: true,
		inputPath: 'index.html',
		outputPath: outputHTMLPath,
		rootDirectoryPath
	});

	await webSignService.submitRelease(
		{
			expirationTimestamp: timestamp + ttlMonths * 2.628e9,
			keyPersistence: tofuKeyPersistence ?
				WebSignKeyPersistence.TOFU :
				WebSignKeyPersistence.Default,
			mandatoryUpdate,
			packageName,
			payload: (await fs.readFile(outputHTMLPathFull)).toString(),
			requiredUserSignatures,
			timestamp
		},
		{
			subresources: Object.fromEntries(
				await Promise.all(
					(
						await glob(path.join(rootOutputPathFull, '**'), {
							ignore: ['.index.html', '**/*.srihash'],
							nodir: true
						})
					).map(async subresource => [
						subresource.slice(rootOutputPathFull.length + 1),
						await fs.readFile(subresource)
					])
				)
			)
		}
	);

	if (keepBuildArtifacts) {
		return;
	}

	await fs.rm(rootOutputPathFull, {recursive: true});
};
