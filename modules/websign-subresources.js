#!/usr/bin/env node

import {util} from '@cyph/sdk';
import fastSHA512 from 'fast-sha512';
import fs from 'fs/promises';
import glob from 'glob/sync.js';
import mkdirp from 'mkdirp';
import path from 'path';
import {getCDNRepo} from './cdn-repo.js';
import {brotli, gzip} from './compression.js';
import {ipfsAdd} from './ipfs.js';
import {ipfsWarmUpGateways} from './ipfs-gateways.js';

const {lockFunction} = util;

const gitCommitLock = lockFunction();

const processSubresource = async (content, ipfsCredentials) => {
	const buf = Buffer.from(content);

	const [brotliEncoded, gzipEncoded, sriHash] = await Promise.all([
		brotli.encode(buf),
		gzip.encode(buf),
		fastSHA512.hash(buf).then(o => o.hex)
	]);

	const ipfsHash = await ipfsAdd(brotliEncoded, ipfsCredentials);

	return {
		brotliEncoded,
		gzipEncoded,
		ipfsHash,
		sriHash
	};
};

export const publishSubresources = async ({
	customBuilds = {},
	ipfsCredentials,
	packageName,
	subresources,
	test = false
}) => {
	console.log({
		publishSubresources: {
			customBuilds: Object.keys(customBuilds),
			packageName,
			subresources: Object.keys(subresources),
			test
		}
	});

	const cdnRepo = await getCDNRepo();

	const packageParent = test ? path.join('websign', 'test') : '';
	const packageFullPath = path.join(
		cdnRepo.repoPath,
		packageParent,
		packageName
	);

	await mkdirp(packageFullPath);

	await Promise.all(
		Object.entries(subresources).map(async ([subresource, content]) => {
			const {brotliEncoded, gzipEncoded, ipfsHash, sriHash} =
				await processSubresource(content, ipfsCredentials);

			const oldIPFSHash = (
				await fs
					.readFile(path.join(packageFullPath, `${subresource}.ipfs`))
					.catch(() => undefined)
			)
				?.toString()
				.trim();

			/* Avoid empty commits */
			if (ipfsHash === oldIPFSHash) {
				return;
			}

			await gitCommitLock(async () => {
				for (const [ext, contentToAdd] of [
					['br', brotliEncoded],
					['gz', gzipEncoded],
					['ipfs', ipfsHash]
				]) {
					await cdnRepo.add(
						path.join(
							packageParent,
							packageName,
							`${subresource}.${ext}`
						),
						contentToAdd
					);
				}

				console.log({
					publishSubresourcesCommit: {
						ipfsHash,
						oldIPFSHash,
						packageName,
						packageParent,
						subresource,
						test
					}
				});

				await cdnRepo.commit(sriHash);
			});
		})
	);

	for (const [customBuild, rootResources] of Object.entries(customBuilds)) {
		const rootResourceNames = new Set(Object.keys(rootResources));

		for (const [rootResource, content] of Object.entries(rootResources)) {
			const {brotliEncoded, gzipEncoded, ipfsHash, sriHash} =
				await processSubresource(content, ipfsCredentials);

			for (const [ext, contentToAdd] of [
				['br', brotliEncoded],
				['gz', gzipEncoded],
				['ipfs', ipfsHash]
			]) {
				await cdnRepo.add(
					path.join(
						packageParent,
						customBuild,
						`${rootResource}.${ext}`
					),
					contentToAdd
				);
			}

			console.log({
				publishSubresourcesCustomBuild: {
					customBuild,
					ipfsHash,
					packageName,
					rootResource,
					sriHash,
					test
				}
			});
		}

		for (const subresource of Object.keys(subresources)) {
			if (rootResourceNames.has(subresource)) {
				continue;
			}

			for (const ext of ['br', 'gz', 'ipfs']) {
				const fileName = `${subresource}.${ext}`;
				const filePath = path.join(
					packageParent,
					customBuild,
					fileName
				);

				const fileFullPath = path.join(cdnRepo.repoPath, filePath);
				const fileExists = await fs
					.access(fileFullPath)
					.then(() => true)
					.catch(() => false);

				if (fileExists) {
					continue;
				}

				await fs.symlink(
					path.join('..', packageName, fileName),
					fileFullPath
				);
				await cdnRepo.add(filePath);
			}
		}

		await cdnRepo.commit(customBuild);
	}

	for (const p of [packageName, ...Object.keys(customBuilds)]) {
		for (const specialCaseTLD of ['app', 'ws']) {
			const pAlias = p.replace(new RegExp(`\\.${specialCaseTLD}$`), '');

			if (p === pAlias) {
				continue;
			}

			const pAliasFullPath = path.join(
				cdnRepo.repoPath,
				packageParent,
				pAlias
			);
			const pAliasExists = await fs
				.access(pAliasFullPath)
				.then(() => true)
				.catch(() => false);

			/* Avoid empty commits */
			if (pAliasExists) {
				continue;
			}

			await fs.symlink(packageName, pAliasFullPath);

			await cdnRepo.add(pAlias);
			await cdnRepo.commit(pAlias);
		}
	}

	await cdnRepo.push();

	const ipfsFiles = glob(path.join(packageFullPath, '**', '*.ipfs'), {
		nodir: true
	});

	await ipfsWarmUpGateways(
		await Promise.all(
			ipfsFiles.map(async ipfsFile =>
				(await fs.readFile(ipfsFile)).toString().trim()
			)
		)
	);
};
