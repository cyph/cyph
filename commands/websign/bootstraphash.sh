#!/bin/bash

cd "$(cd "$(dirname "$0")" ; pwd)"

node -e '(async () => {
	console.log((await require("supersphincs").hash(
		await require("./bootstrapstring").bootstrapString()
	)).hex);
})().catch(err => {
	console.error(err);
	process.exit(1);
})'
