import childProcess from 'child_process';

export default childProcess.spawnSync(
	'bash',
	[`${__dirname}/../commands/buildunbundledassets.sh`, '--test'],
	{stdio: 'inherit'}
);
