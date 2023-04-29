#!/usr/bin/env node

import fs from 'fs';
import {
	add,
	checkout,
	clone,
	commit,
	fetch,
	log,
	pull,
	push
} from 'isomorphic-git';
import http from 'isomorphic-git/http/node/index.js';
import {mkdirp} from 'mkdirp';
import os from 'os';
import path from 'path';

export class GitRepo {
	async add (filePath, content, commitMessage)  {
		await this.ready;

		const fullPath = path.join(this.repoPath, filePath);

		if (content !== undefined) {
			await mkdirp(path.dirname(fullPath));
			await fs.promises.writeFile(fullPath, content);
		}

		await fs.promises.chmod(fullPath, 0o700);
		await add({...this.options, filepath: filePath});

		if (commitMessage !== undefined) {
			await this.commit(commitMessage);
		}
	}

	async checkout (branch)  {
		await this.ready;
		await checkout({...this.options, ref: branch});
	}

	async commit (message)  {
		await this.ready;
		await commit({...this.options, message});
	}

	async log (depth)  {
		await this.ready;
		return log({...this.options, depth});
	}

	async pull ()  {
		await this.ready;
		await fetch(this.options);
		await pull(this.options);
	}

	async push ()  {
		await this.ready;

		const result = await push(this.options);

		if (result.ok) {
			return;
		}

		throw new Error(
			result.error || `git push to ${this.options.url} failed.`
		);
	}

	get repoPath ()  {
		return this.options.dir;
	}

	constructor ({
		author = {
			email: 'git@cyph.com',
			name: 'Cyph'
		},
		repoPath,
		url
	} = {}) {
		if (!url) {
			throw new Error('Unspecified URL for git repository.');
		}

		this.options = {
			author,
			dir:
				repoPath ||
				path.join(os.tmpdir(), Buffer.from(url).toString('hex')),
			fs,
			http,
			url
		};

		this.ready = (async () => {
			const isExistingRepo =
				!!repoPath &&
				(await fs.promises
					.access(path.join(repoPath, '.git'))
					.then(() => true)
					.catch(() => false));

			if (isExistingRepo) {
				await fetch(this.options);
				await pull(this.options);
			}
			else {
				await clone(this.options);
			}
		})();
	}
}
