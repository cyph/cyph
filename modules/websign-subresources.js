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

export const publishSubresources = async ({
	customBuilds = [],
	packageName,
	subresources,
	test = false
}) => {
	customBuilds = customBuilds.filter(s => !!s);

	console.log({
		publishSubresources: {
			customBuilds,
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

	await mkdirp(path.join(cdnRepo.repoPath, packageParent, packageName));

	await Promise.all(
		Object.entries(subresources).map(async ([subresource, content]) => {
			const buf = Buffer.from(content);

			const [brotliEncoded, gzipEncoded, sriHash] = await Promise.all([
				brotli.encode(buf),
				gzip.encode(buf),
				fastSHA512.hash(buf).then(o => o.hex)
			]);

			const ipfsHash = await ipfsAdd(brotliEncoded);

			const oldIPFSHash = (
				await fs
					.readFile(
						path.join(
							cdnRepo.repoPath,
							packageParent,
							packageName,
							`${subresource}.ipfs`
						)
					)
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

				await cdnRepo.commit(sriHash);
			});
		})
	);

	for (const customBuild of customBuilds) {
		let filesModified = false;

		for (const subresource of Object.keys(subresources)) {
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

				/* Avoid empty commits */
				if (fileExists) {
					continue;
				}

				await fs.symlink(
					path.join('..', packageName, fileName),
					fileFullPath
				);

				await cdnRepo.add(filePath);

				filesModified = true;
			}
		}

		/* Avoid empty commits */
		if (!filesModified) {
			continue;
		}

		await cdnRepo.commit(customBuild);
	}

	for (const p of [packageName, ...customBuilds]) {
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
