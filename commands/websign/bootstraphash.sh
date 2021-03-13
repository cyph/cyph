#!/bin/bash

cd "$(cd "$(dirname "$0")" ; pwd)"

node -e '(async () => {
	console.log((await require("supersphincs").hash(
		await (await import("./bootstrapstring.js")).bootstrapString()
	)).hex);

	process.exit();
})().catch(err => {
	console.error(err);
	process.exit(1);
})'
