#!/bin/bash

cd "$(cd "$(dirname "$0")" ; pwd)"

node -e '(async () => {
	console.log((await (await import("supersphincs")).hash(
		await (await import("./bootstrapstring.js")).bootstrapString()
	)).hex);
})().catch(err => {
	console.error(err);
	process.exit(1);
})'
