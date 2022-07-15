#!/bin/bash

cd "$(cd "$(dirname "$0")" ; pwd)"

node -e '(async () => {
	console.log((await require("fast-sha512").hash(
		await (await import("./bootstrapstring.js")).bootstrapString()
	)).hex);

	process.exit(0);
})().catch(err => {
	console.error(err);
	process.exit(1);
})'
