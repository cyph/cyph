#!/usr/bin/env node

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cat = f => {
	try {
		return fs
			.readFileSync(f)
			.toString()
			.trim();
	}
	catch (_) {
		return '';
	}
};

const catJSON = f => {
	try {
		return JSON.parse(cat(f));
	}
	catch (_) {}
};

const exec = command =>
	childProcess
		.execSync(command, {cwd: __dirname})
		.toString()
		.trim();

const open = url =>
	require(path.join(__dirname, 'shared', 'node_modules', 'opn'))(url);

const spawn = (command, args, cwd, env) =>
	(
		childProcess.spawnSync(command, args, {
			cwd: path.join(__dirname, cwd || ''),
			...(env ? {env: {...process.env, ...env}} : {})
		}).stdout || ''
	)
		.toString()
		.trim();

const spawnAsync = (command, args, cwd, env) =>
	new Promise(resolve =>
		childProcess
			.spawn(command, args, {
				cwd: path.join(__dirname, cwd || ''),
				...(env ? {env: {...process.env, ...env}} : {}),
				stdio: 'inherit'
			})
			.on('exit', () => {
				resolve();
			})
	);

const runScript = script => {
	const tmpFile = path.join(
		os.tmpdir(),
		crypto.randomBytes(32).toString('hex')
	);
	fs.writeFileSync(tmpFile, script);
	return spawnAsync('bash', [tmpFile]);
};

const fail = errorMessage => {
	console.error(`ERROR: ${errorMessage}`);
	process.exit(0);
};

const isMacOS = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

if (!spawn('docker', ['-v'])) {
	fail(
		`Install Docker first and try again: ${
			isMacOS || isWindows ?
				'https://www.docker.com/products/docker-desktop' :
				'https://docs.docker.com/install/#server'
		}`
	);
}

const args = {
	command: process.argv[2],
	background: process.argv.indexOf('--background') > -1,
	noAutoMake:
		process.argv[2] === 'make' ||
		process.argv.indexOf('--no-auto-make') > -1,
	noUpdates: process.argv.indexOf('--no-updates') > -1,
	prod: process.argv.indexOf('--prod') > -1,
	simple:
		process.argv.indexOf('--simple') > -1 ||
		process.argv.indexOf('--simple-custom-build') > -1 ||
		process.argv.indexOf('--simple-prod-build') > -1 ||
		process.argv.indexOf('--simple-websign-build') > -1 ||
		process.argv.indexOf('--simple-websign-prod-build') > -1,
	site:
		process.argv[process.argv.indexOf('--site') + 1 || undefined] ||
		(process.argv.indexOf('--firebase-local') > -1 ? 'firebase' : undefined)
};

const baseShellCommandArgs = process.argv
	.slice(3)
	.filter(
		s =>
			s !== '--background' &&
			s !== '--no-auto-make' &&
			s !== '--no-updates'
	);
const shellCommandArgs = baseShellCommandArgs
	.map(s => (s.indexOf("'") ? `"${s.replace(/"/g, '\\"')}"` : `'${s}'`))
	.join(' ');
const homeDir = os.homedir();
const cyphConfigDir = path.join(homeDir, '.cyph');
const backupDir = path.join(homeDir, '.cyphbackup');
const backupTargets = ['gitconfig', 'gnupg', 'ssh'];
const dockerHomeDir = '/home/gibson';
const dockerCredentials = catJSON(
	path.join(cyphConfigDir, 'docker-credentials.json')
);
const agseRemoteAddress = '10.0.0.42';
const agseLocalAddress = '10.0.0.43';
const agseRemoteMAC = cat(path.join(cyphConfigDir, 'agse.remote.mac'));
const agseLocalInterface = cat(
	path.join(cyphConfigDir, 'agse.local.interface')
);
const agseTempFile = path.join(os.tmpdir(), 'balls');
const commandAdditionalArgs = [];

const commandScript = fs.existsSync(
	path.join(__dirname, 'commands', `${args.command}.sh`)
) ?
	`${args.command}.sh` :
fs.existsSync(path.join(__dirname, 'commands', `${args.command}.js`)) ?
	`${args.command}.js` :
	undefined;

const gitconfigPath = path.join(homeDir, '.gitconfig');
const gitconfigDockerPath = `${dockerHomeDir}/.gitconfig`;
const serveReadyPath = path.join(__dirname, 'serve.ready');

const needAGSE =
	(args.command === 'sign' && process.argv[4] !== '--test') ||
	(args.command === 'certsign' &&
		(!process.argv[3] || process.argv[3] === 'cyphme')) ||
	(args.command === 'deploy' &&
		!args.simple &&
		(!args.site || args.site === 'cyph.app'));

const isProdAGSEDeploy = needAGSE && args.command === 'deploy' && args.prod;
const branch = (
	spawn('git', ['describe', '--tags', '--exact-match']) ||
	spawn('git', ['branch'])
		.split('\n')
		.filter(s => s && s.indexOf('*') === 0)[0]
		.split(/\s+/)[1]
).toLowerCase();

const image = `cyph/${branch === 'prod' ? 'prod' : 'dev'}`;

const imageAlreadyBuilt = spawn('docker', ['images'])
	.split('\n')
	.slice(1)
	.some(s => s.trim().split(/\s+/)[0] === image);

const isCyphInternal = fs.existsSync(cyphConfigDir);

const mounts = [
	`${__dirname}:/cyph`,
	...(!isCyphInternal ?
		[] :
		[
			`${cyphConfigDir}:${dockerHomeDir}/.cyph`,
			...(isWindows ?
				[] :
				[
					`${path.join(
						homeDir,
						'.gnupg'
					)}:${dockerHomeDir}/.gnupg.original`,
					`${path.join(homeDir, '.ssh')}:${dockerHomeDir}/.ssh`
				])
		])
]
	.map(s => ['-v', s])
	.reduce((a, b) => a.concat(b), []);

const containerInitScript =
	(!fs.existsSync(gitconfigPath) ?
		'' :
		`
			echo '${fs
						.readFileSync(gitconfigPath)
						.toString(
							'base64'
						)}' | base64 --decode > ${gitconfigDockerPath}
		`) +
	(!isWindows ?
		'' :
		`
			sudo touch /windows
			sudo mv /bin/ln /bin/ln.old
			echo '
				#!/bin/bash

				if [ "\${1}" != "-s" -o "\${#}" != "3" ] ; then
					/bin/ln.old "\${@}"
				elif [ -f "\${2}" ] ; then
					cp -f "\${2}" "\${3}"
				else
					rm -rf "\${3}" 2> /dev/null
					mkdir "\${3}"
					sudo mount --bind "\${2}" "\${3}"
				fi
			' |
				sudo tee -a /bin/ln > /dev/null
			sudo chmod +x /bin/ln
	`);

const shellScripts = {
	agseInit: `
		echo 'Need root for AGSE connection setup.'
		sudo echo

		sudo ipconfig set ${agseLocalInterface} INFORM ${agseLocalAddress} 2> /dev/null
		sleep 1
		sudo ip addr add ${agseLocalAddress} dev ${agseLocalInterface} 2> /dev/null
		sleep 1

		sudo arp -d ${agseRemoteAddress} 2> /dev/null
		sleep 1
		sudo route delete ${agseRemoteAddress} 2> /dev/null
		sleep 1
		sudo route add -host ${agseRemoteAddress} -interface ${agseLocalInterface} 2> /dev/null
		sleep 1
		sudo arp -s ${agseRemoteAddress} ${agseRemoteMAC} 2> /dev/null
		sleep 1
		sudo ip neigh \\
			add ${agseRemoteAddress} \\
			lladdr ${agseRemoteMAC} \\
			dev ${agseLocalInterface} \\
		2> /dev/null
		sleep 1

		sudo bash -c "
			rm '${agseTempFile}' 2> /dev/null
			while [ ! -f '${agseTempFile}' ] ; do sleep 1 ; done
			rm '${agseTempFile}'

			ip addr del ${agseLocalAddress} dev ${agseLocalInterface} 2> /dev/null
			sleep 1
			ipconfig set ${agseLocalInterface} DHCP 2> /dev/null
			sleep 1

			ip link set ${agseLocalInterface} down 2> /dev/null
			sleep 1
			ifconfig ${agseLocalInterface} down 2> /dev/null
			sleep 1

			ip link set ${agseLocalInterface} up 2> /dev/null
			sleep 1
			ifconfig ${agseLocalInterface} up 2> /dev/null
			sleep 1
		" &
	`,
	aptUpdate: {
		command: `
			${containerInitScript}
			/cyph/commands/updatedockerimage.sh
		`,
		condition: `
			[ ! -f ~/.updated ] || test "$(find ~/.updated -mtime +3)"
		`
	},
	command: `
		${containerInitScript}
		source ~/.bashrc
		/cyph/commands/${commandScript} ${shellCommandArgs}
		notify 'Command complete: ${args.command}' &> /dev/null
	`,
	libUpdate: {
		command: `
			${containerInitScript}
			source ~/.bashrc
			/cyph/commands/updatedockerimage.sh
			/cyph/commands/getlibs.sh
		`,
		condition: `
			! cmp /cyph/shared/lib/js/yarn.lock /node_modules/yarn.lock &> /dev/null ||
			! cmp /cyph/shared/node_modules/yarn.lock /node_modules/yarn.lock &> /dev/null
		`
	},
	setup: `
		${containerInitScript}
		/cyph/commands/dockerpostmake.sh
		source ~/.bashrc
		notify 'Make complete'
		${
			!isCyphInternal ?
				'' :
				`
					gcloud init
					echo
					firebase login --no-localhost
				`
		}
	`
};

const backup = () => {
	if (!isCyphInternal || isWindows) {
		return;
	}

	for (const d of fs.readdirSync(backupDir).filter(d => d !== '.git')) {
		spawn('rm', ['-rf', path.join(backupDir, d)]);
	}

	childProcess.spawnSync('git', ['init'], {cwd: backupDir});
	try {
		fs.mkdirSync(path.join(backupDir, 'cyph'));
	}
	catch (_) {}

	for (const d of backupTargets) {
		spawn('cp', [
			'-a',
			path.join(homeDir, `.${d}`),
			path.join(backupDir, d)
		]);
	}

	for (const d of fs.readdirSync(cyphConfigDir).filter(d => d !== 'cdn')) {
		spawn('cp', [
			'-a',
			path.join(cyphConfigDir, d),
			path.join(backupDir, 'cyph', d)
		]);
	}

	childProcess.spawnSync('git', ['add', '.'], {cwd: backupDir});
	childProcess.spawnSync(
		'git',
		['commit', '--no-gpg-sign', '-a', '-m', 'backup'],
		{cwd: backupDir}
	);
};

const containerName = command => `${image}_${command}`.replace(/\//g, '_');

const dockerRun = (
	command,
	name,
	background,
	noCleanup,
	additionalArgs,
	getOutput
) => {
	const processArgs = ['run', '--privileged', getOutput ? '-i' : '-it']
		.concat(name ? [`--name=${name}`] : [])
		.concat(background ? [`-d`] : [])
		.concat(!noCleanup ? [`--rm=true`] : [])
		.concat(mounts)
		.concat(additionalArgs || [])
		.concat([image, 'bash', '-c', command]);

	if (getOutput) {
		return spawn('docker', processArgs);
	}
	else {
		return spawnAsync('docker', processArgs);
	}
};

const dockerCP = (src, dest) => {
	const container = containerName(crypto.randomBytes(32).toString('hex'));

	dockerRun('sleep Infinity', container).catch(() => {});

	const f = () => {
		if (getContainerPIDs(container).length < 1) {
			return new Promise(resolve => setTimeout(resolve, 1000)).then(f);
		}

		spawn('docker', ['cp', '-a', `${container}:${src}`, dest]);
		killContainer(container);
		return Promise.resolve();
	};

	return f();
};

const editImage = (command, condition, dryRunName, useOriginal = false) =>
	Promise.resolve().then(() => {
		if (
			condition &&
			dockerRun(
				`if ${condition}\nthen echo dothemove\nfi`,
				undefined,
				undefined,
				undefined,
				undefined,
				true
			) !== 'dothemove'
		) {
			return false;
		}

		if (dryRunName) {
			console.error(`WARNING: Skipping update "${dryRunName}"`);
			return false;
		}

		const tmpContainer = containerName('tmp');

		spawn('docker', ['rm', '-f', tmpContainer]);

		return Promise.resolve(
			useOriginal ?
				spawnAsync('docker', [
					'tag',
					`${image}_original:latest`,
					`${image}:latest`
				]) :
				undefined
		)
			.then(() =>
				dockerRun(command, tmpContainer, undefined, true, [
					'-p',
					'9005:9005'
				])
			)
			.then(() => spawnAsync('docker', ['commit', tmpContainer, image]))
			.then(() => spawnAsync('docker', ['rm', '-f', tmpContainer]))
			.then(() => spawnAsync('docker', ['system', 'prune', '-f']))
			.then(() => true);
	});

const getContainerPIDs = name =>
	spawn('docker', ['ps', '-a'])
		.split('\n')
		.slice(1)
		.filter(s => s.indexOf(name) > -1)
		.map(s => s.split(/\s+/)[0]);

const killContainer = name => {
	for (const pid of getContainerPIDs(name)) {
		console.log(spawn('docker', ['kill', '-s', '9', pid]));
		console.log(spawn('docker', ['rm', '-f', pid]));
	}
};

const killEverything = () => killContainer('cyph');

const huskySetup = () => {
	backup();

	const huskyRunPath = path.join(
		__dirname,
		'shared',
		'node_modules',
		'.bin',
		'husky-run'
	);

	if (fs.existsSync(huskyRunPath)) {
		fs.unlinkSync(huskyRunPath);
	}

	fs.writeFileSync(
		huskyRunPath,
		'#!/usr/bin/env node\nrequire("../husky/bin/run")'
	);
	fs.chmodSync(
		huskyRunPath,
		fs.constants.S_IRUSR |
			fs.constants.S_IWUSR |
			fs.constants.S_IXUSR |
			fs.constants.S_IRGRP |
			fs.constants.S_IWGRP |
			fs.constants.S_IXGRP |
			fs.constants.S_IROTH |
			fs.constants.S_IWOTH |
			fs.constants.S_IXOTH
	);

	return spawnAsync(
		'node',
		[
			path.join(
				__dirname,
				'shared',
				'node_modules',
				'husky',
				'lib',
				'installer',
				'bin.js'
			),
			'install'
		],
		undefined,
		{
			INIT_CWD: __dirname,
			npm_config_user_agent: 'npm/6.0.0'
		}
	);
};

const pullUpdates = (forceUpdate = false, initialSetup = false) => {
	if (args.noUpdates) {
		return Promise.resolve();
	}

	return editImage(
		shellScripts.libUpdate.command,
		shellScripts.libUpdate.condition,
		forceUpdate ? undefined : 'getlibs',
		true
	)
		.then(didUpdate =>
			didUpdate ?
				true :
				editImage(
					shellScripts.aptUpdate.command,
					shellScripts.aptUpdate.condition,
					forceUpdate ? undefined : 'APT update'
				)
		)
		.then(didUpdate => {
			if (!initialSetup && !didUpdate) {
				return;
			}

			return huskySetup();
		});
	/*
		.then(() => {
			const libNative = path.join('shared', 'lib', 'native');
			const ready = path.join(__dirname, libNative, '.ready');

			if (fs.existsSync(ready)) {
				return;
			}

			console.log(spawn('npm', ['-g', 'update']));
			console.log(spawn('npm', ['-g', 'install', 'nativescript']));
			for (const platform of ['android', 'ios']) {
				spawn('tns', ['platform', 'add', platform], libNative);
			}

			fs.writeFileSync(ready, '');
		});
	*/
};

const removeImage = (name, opts) => {
	for (const imageId of spawn('docker', ['images'].concat(opts || []))
		.split('\n')
		.slice(1)
		.filter(s => (name ? s.indexOf(name) > -1 : true))
		.map(s => s.split(/\s+/)[2])) {
		console.log(spawn('docker', ['rmi', '-f', imageId]));
	}
};

const dockerBase64Files = s =>
	s.replace(
		/BASE64_FILES/,
		[
			'commands/.bashrc',
			'commands/dockerpostmake.sh',
			'commands/getlibs.sh',
			'commands/libclone.sh',
			'commands/updatedockerimage.sh',
			'native/plugins.list',
			'shared/lib/js/package.json',
			'shared/lib/js/yarn.lock'
		]
			.map(filePath =>
				fs
					.readFileSync(filePath)
					.toString()
					.match(/(.|\n){1,32768}/g)
					.map(s => Buffer.from(s).toString('base64'))
					.map(
						base64 =>
							`RUN echo '${base64}' | base64 --decode >> ~/getlibs/${filePath}`
					)
					.join('\n')
			)
			.join('\n')
	);

const updateCircleCI = () => {
	if (args.noUpdates) {
		return Promise.resolve();
	}

	fs.writeFileSync(
		'Dockerfile.tmp',
		dockerBase64Files(
			fs
				.readFileSync('Dockerfile')
				.toString()
				.split('\n')
				.filter(s => !s.startsWith('VOLUME'))
				.join('\n')
				.replace('WORKDIR /cyph/commands', 'WORKDIR /cyph')
				.replace(/#CIRCLECI:/g, '')
				.replace(/#SETUP:/g, '')
		)
	);

	return spawnAsync('docker', [
		'build',
		'-t',
		'cyph/circleci:latest',
		'-f',
		'Dockerfile.tmp',
		'.'
	])
		.then(() =>
			dockerCredentials ?
				spawnAsync('docker', [
					'login',
					'-u',
					dockerCredentials.username,
					'-p',
					dockerCredentials.password
				]) :
				undefined
		)
		.then(() => spawnAsync('docker', ['push', 'cyph/circleci:latest']))
		.then(() => {
			fs.unlinkSync('Dockerfile.tmp');
		})
		.then(() =>
			Promise.all(
				spawn('docker', ['images', '-a'])
					.split('\n')
					.slice(1)
					.filter(s => s.indexOf('cyph/circleci') > -1)
					.map(s => spawnAsync('docker', ['rmi', s.split(/\s+/)[0]]))
			)
		);
};

if (!isCyphInternal && needAGSE) {
	fail('Non-Cyph-employee. AGSE unsupported.');
}
if (isWindows && needAGSE) {
	fail('AGSE not yet supported on Windows.');
}

let exitCleanup = () => {};
let initPromise = Promise.resolve();

const make = () => {
	killEverything();

	fs.writeFileSync(
		'Dockerfile.tmp',
		dockerBase64Files(
			fs
				.readFileSync('Dockerfile')
				.toString()
				.replace(/#SETUP:/g, '')
		)
	);

	initPromise = spawnAsync('docker', [
		'build',
		'-t',
		image,
		'-f',
		'Dockerfile.tmp',
		'.'
	])
		.then(() =>
			spawnAsync('docker', [
				'tag',
				`${image}:latest`,
				`${image}_original:latest`
			])
		)
		.then(() => {
			fs.unlinkSync('Dockerfile.tmp');
		})
		.then(() => editImage(shellScripts.setup))
		.then(() =>
			spawnAsync('docker', [
				'tag',
				`${image}:latest`,
				`${image}_original:latest`
			])
		)
		.then(() => {
			if (fs.existsSync('shared/node_modules')) {
				fs.rmdirSync('shared/node_modules', {recursive: true});
			}

			return dockerCP('/node_modules', 'shared/node_modules');
		})
		.then(() => huskySetup());
};

if (!imageAlreadyBuilt) {
	if (args.noAutoMake) {
		if (args.command !== 'make') {
			fail('Image not yet built. Run `./docker.js make` first.');
		}
	}
	else {
		console.error(
			'WARNING: Building your local development image. This may take a while.'
		);
		make();
	}
}

if (needAGSE) {
	commandAdditionalArgs.push('-p', '31337:31337/udp');

	exitCleanup = () => fs.appendFileSync(agseTempFile, '');
	initPromise = runScript(shellScripts.agseInit);
}

switch (args.command) {
	case 'editimage':
		editImage(`source ~/.bashrc ; ${baseShellCommandArgs[0]}`);
		break;

	case 'kill':
		killEverything();
		break;

	case 'make':
		make();
		break;

	case 'makeclean':
		killEverything();
		removeImage('cyph');
		removeImage(undefined, ['--filter', 'dangling=true']);
		break;

	case 'serve':
		const base = 'http://localhost';
		const projects = ['backend', 'cyph.com', 'cyph.app', 'docs'];
		const postOpenLogs = [];

		for (let i = 0; i < projects.length; ++i) {
			const port = `4200${i}`;

			commandAdditionalArgs.push('-p', `${port}:${port}`);
			postOpenLogs.push(`${projects[i]}: ${base}:${port}`);
		}

		commandAdditionalArgs.push('-p', '44000:44000');

		console.log('\n\n');

		if (fs.existsSync(serveReadyPath)) {
			fs.unlinkSync(serveReadyPath);
		}

		const waitUntilServeReady = () =>
			new Promise(resolve => setTimeout(resolve, 5000))
				.then(
					() =>
						new Promise(resolve =>
							fs.exists(serveReadyPath, resolve)
						)
				)
				.then(exists =>
					exists ?
						fs
							.readFileSync(serveReadyPath)
							.toString()
							.trim()
							.split(' ') :
						waitUntilServeReady()
				);

		waitUntilServeReady()
			.then(ports =>
				ports.reduce(
					(p, port) => p.then(() => open(`http://localhost:${port}`)),
					Promise.resolve()
				)
			)
			.then(() => {
				for (const postOpenLog of postOpenLogs) {
					console.log(postOpenLog);
				}
				fs.unlinkSync(serveReadyPath);
			});
		break;

	case 'test':
		commandAdditionalArgs.push('-p', '9876:9876');
		commandAdditionalArgs.push('-p', '42000:42000');
		commandAdditionalArgs.push('-p', '42001:42001');
		commandAdditionalArgs.push('-p', '42002:42002');
		commandAdditionalArgs.push('-p', '44000:44000');
		break;

	case 'updatecircleci':
		updateCircleCI();
		break;

	default:
		if (!commandScript) {
			fail('fak u gooby');
		}
}

process.on('exit', exitCleanup);
process.on('SIGINT', exitCleanup);
process.on('uncaughtException', exitCleanup);

initPromise.then(() => {
	if (!commandScript) {
		return;
	}

	killContainer(containerName(args.command));

	pullUpdates(
		isProdAGSEDeploy ||
			args.command === 'getlibs' ||
			args.command === 'updatelibs' ||
			args.command === 'verify'
	)
		.then(() => {
			if (args.command === 'getlibs') {
				return;
			}

			return dockerRun(
				shellScripts.command,
				containerName(args.command),
				args.background,
				false,
				commandAdditionalArgs
			);
		})
		.then(() => {
			if (args.command === 'updatelibs') {
				updateCircleCI();
			}
		});
});
