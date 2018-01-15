module.exports	= require('child_process').spawnSync('bash', [
	`${__dirname}/../commands/buildunbundledassets.sh`,
	'--test'
]);
