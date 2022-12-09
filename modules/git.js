#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import {add, checkout, clone, commit, fetch, pull, push} from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import os from 'os';
import path from 'path';

export class GitRepo {
	async add (filePath, content, commitMessage)  {
		await this.ready;

		if (content !== undefined) {
			await fs.promises.writeFile(filePath, content);
		}

		await fs.promises.chmod(filePath, 0700);
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

	constructor ({author, dir, url} = {}) {
		if (!url) {
			throw new Error('Unspecified URL for git repository.');
		}

		this.options = {
			author,
			dir: dir || path.join(os.tmpdir(), crypto.randomUUID()),
			fs,
			http,
			url
		};

		this.ready = (async () => {
			const isExistingRepo =
				!!dir &&
				(await fs.promises
					.access(path.join(dir, '.git'))
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
