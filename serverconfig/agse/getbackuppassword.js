#!/usr/bin/env node

const read = require('read');

(async () => {
	const askQuestion = async (prompt, silent) =>
		read({
			output: process.stderr,
			prompt: `${prompt} `,
			silent: silent === true
		});

	while (true) {
		const password = await askQuestion(
			'Backup password (leave blank to exit and try again later):'
		);

		const passwordSplit = password.split(' ');
		const passwordMiddle = passwordSplit.length / 2;

		if (passwordSplit.length % 2 !== 0) {
			console.error('Password must contain even number of words.');
			continue;
		}

		const aesPassword = passwordSplit.slice(0, passwordMiddle).join(' ');
		const sodiumPassword = passwordSplit.slice(passwordMiddle).join(' ');

		console.log(`
			backupPasswordAes="${aesPassword}"
			backupPasswordSodium="${sodiumPassword}"
		`);

		return;
	}
})();
