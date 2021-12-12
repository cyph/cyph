#!/usr/bin/env node

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const cat = f => {
	try {
		return fs.readFileSync(f).toString().trim();
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
	childProcess.execSync(command, {cwd: __dirname}).toString().trim();

const open = url =>
	require(path.join(__dirname, 'shared', 'node_modules', 'open'))(url);

const spawn = (command, args, cwd, env) =>
	(
		childProcess.spawnSync(command, args, {
			cwd: path.join(__dirname, cwd || ''),
			...(env ? {env: {...process.env, ...env}} : {})
		}).stdout || ''
	)
		.toString()
		.trim();

const spawnAsync = (command, args, cwd, env, retryInterval) => {
	const promise = new Promise(resolve => {
		const result = childProcess.spawn(command, args, {
			cwd: path.join(__dirname, cwd || ''),
			...(env ? {env: {...process.env, ...env}} : {}),
			stdio: 'inherit'
		});

		return result.on('exit', () => {
			resolve(result);
		});
	});

	if (
		typeof retryInterval !== 'number' ||
		isNaN(retryInterval) ||
		retryInterval < 0
	) {
		return promise;
	}

	return promise.then(result => {
		if (result.exitCode === 0) {
			return result;
		}

		console.error(
			`retrying failed spawnAsync: ${JSON.stringify({
				command,
				args,
				cwd,
				env,
				retryInterval
			})}`
		);

		return new Promise(resolve => setTimeout(resolve, retryInterval)).then(
			() => spawnAsync(command, args, cwd, env, retryInterval)
		);
	});
};

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
	process.exit(1);
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
const backupDirGitLock = path.join(backupDir, '.git', 'index.lock');
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

const baseImageDigestsPath = path.join(__dirname, 'base-image-digests.json');
const circleciConfigPath = path.join(__dirname, 'circle.yml');
const codespaceDockerfilePath = path.join(__dirname, 'Dockerfile.codespace');
const gitconfigPath = path.join(homeDir, '.gitconfig');
const gitconfigDockerPath = `${dockerHomeDir}/.gitconfig`;
const serveReadyPath = path.join(__dirname, 'serve.ready');
const webSignServeReadyPath = path.join(__dirname, 'websign-serve.ready');

const dockerfileHostedImages = {
	'Dockerfile.circleci': 'cyph/circleci'
};

let baseImageDigests = catJSON(baseImageDigestsPath);

/* TODO: Support more architectures and get exact arch name */
const currentArch = os.arch() === 'arm64' ? 'linux/arm64' : 'linux/amd64';

const needAGSE =
	(args.command === 'sign' && process.argv[4] !== '--test') ||
	(args.command === 'certsign' &&
		(!process.argv[3] || process.argv[3] === 'cyphme')) ||
	(args.command === 'deploy' &&
		!args.simple &&
		(!args.site || args.site === 'cyph.app'));

const isProdAGSEDeploy = needAGSE && args.command === 'deploy' && args.prod;

const initImage = 'cyph/init';

const image =
	'cyph/' +
	(
		spawn('git', ['describe', '--tags', '--exact-match']) ||
		spawn('git', ['branch'])
			.split('\n')
			.filter(s => s && s.indexOf('*') === 0)[0]
			.split(/\s+/)[1]
	).toLowerCase();

const imageAlreadyBuilt = (imageName = image) =>
	spawn('docker', ['images'])
		.split('\n')
		.slice(1)
		.some(s => s.trim().split(/\s+/)[0] === imageName);

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
	command: `
		${containerInitScript}
		source ~/.bashrc
		/cyph/commands/${commandScript} ${shellCommandArgs}
		if [ '${args.command}' != 'notify' ] ; then
			notify 'Command complete: ${args.command}' &> /dev/null
		fi
	`,
	libUpdate: {
		command: `
			${containerInitScript}
			source ~/.bashrc
			/cyph/commands/updatedockerimage.sh
			/cyph/commands/getlibs.sh
		`,
		condition: `
			! cmp /cyph/base-image-digests.json /home/gibson/.base-image-digests.json &> /dev/null
		`
	},
	setup: !isCyphInternal ?
		'' :
		`
			${containerInitScript}
			source ~/.bashrc
			notify 'Post-make authentication'
			gcloud init
			gcloud config set project cyphme
			echo
			firebase login --no-localhost
		`
};

const backup = () => {
	if (!isCyphInternal || isWindows) {
		return;
	}

	if (!fs.existsSync(backupDir)) {
		fs.mkdirSync(backupDir);
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

	for (const d of fs.readdirSync(cyphConfigDir).filter(d => d !== 'repos')) {
		spawn('cp', [
			'-a',
			path.join(cyphConfigDir, d),
			path.join(backupDir, 'cyph', d)
		]);
	}

	if (fs.existsSync(backupDirGitLock)) {
		fs.unlinkSync(backupDirGitLock);
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
	getOutput,
	imageName = image
) => {
	const processArgs = ['run', '--privileged', getOutput ? '-i' : '-it']
		.concat(name ? [`--name=${name}`] : [])
		.concat(background ? [`-d`] : [])
		.concat(!noCleanup ? [`--rm=true`] : [])
		.concat(mounts)
		.concat(additionalArgs || [])
		.concat([imageName, 'bash', '-c', command]);

	if (getOutput) {
		return spawn('docker', processArgs);
	}
	else {
		return spawnAsync('docker', processArgs);
	}
};

const dockerCP = (src, dest, removeDestDir = false, imageName = image) => {
	if (removeDestDir) {
		removeDirectory(dest);
	}

	const container = containerName(crypto.randomBytes(32).toString('hex'));

	const f = () => {
		if (getContainerPIDs(container).length < 1) {
			dockerRun(
				'sleep Infinity',
				container,
				undefined,
				undefined,
				undefined,
				undefined,
				imageName
			).catch(() => {});
			return new Promise(resolve => setTimeout(resolve, 2500)).then(f);
		}

		spawn('docker', ['cp', '-a', `${container}:${src}`, dest]);
		killContainer(container);
		return Promise.resolve();
	};

	return f();
};

const dockerCheckCondition = condition =>
	!!condition &&
	dockerRun(
		`if ${condition}\nthen echo dothemove\nfi`,
		undefined,
		undefined,
		undefined,
		undefined,
		true
	) === 'dothemove';

const editImage = (
	command,
	condition,
	dryRunName,
	useOriginal = false,
	imageName = image
) =>
	Promise.resolve().then(() => {
		if (condition && !dockerCheckCondition(condition)) {
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
					`${imageName}_original:latest`,
					`${imageName}:latest`
				]) :
				undefined
		)
			.then(() =>
				dockerRun(
					command,
					tmpContainer,
					undefined,
					true,
					['-p', '9005:9005'],
					undefined,
					imageName
				)
			)
			.then(() =>
				spawnAsync('docker', ['commit', tmpContainer, imageName])
			)
			.then(() => spawnAsync('docker', ['rm', '-f', tmpContainer]))
			.then(() => spawnAsync('docker', ['system', 'prune', '-f']))
			.then(() =>
				spawnAsync('docker', [
					'run',
					'--pid=host',
					'--privileged',
					'--rm',
					'docker/desktop-reclaim-space'
				])
			)
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

	return spawnAsync(
		'node',
		['node_modules/husky/lib/bin.js', 'install'],
		undefined,
		{
			INIT_CWD: __dirname
		}
	);
};

const pullUpdates = (forceUpdate = false) => {
	if (
		args.noUpdates ||
		!dockerCheckCondition(shellScripts.libUpdate.condition)
	) {
		return Promise.resolve();
	}

	if (!forceUpdate) {
		console.error(`WARNING: Skipping pending image update`);
		return Promise.resolve();
	}

	return make();

	/*
	return make().then(() => {
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
			'commands/getlibs.sh',
			'commands/updatedockerimage.sh',
			'native/plugins.list',
			'shared/lib/js/package.json',
			'shared/lib/js/package-lock.json'
		]
			.map(filePath =>
				zlib
					.deflateSync(
						filePath.endsWith('.json') ?
							Buffer.from(
								JSON.stringify(
									JSON.parse(
										fs.readFileSync(filePath).toString()
									)
								)
							) :
							fs.readFileSync(filePath)
					)
					.toString('base64')
					.match(/(.|\n){1,32768}/g)
					.map(
						base64 =>
							`RUN echo '${base64}' >> ~/getlibs/${filePath}`
					)
					.concat(
						`RUN node -e "fs.writeFileSync(
							os.homedir() + '/getlibs/${filePath}',
							zlib.inflateSync(
								Buffer.from(
									fs.readFileSync(
										os.homedir() + '/getlibs/${filePath}'
									).toString(),
									'base64'
								)
							).toString()
						)"`.replace(/\s+/g, ' ')
					)
					.join('\n')
			)
			.join('\n')
	);

const getImageDigests = image =>
	spawn('docker', ['buildx', 'imagetools', 'inspect', image])
		.split('Manifests:')[1]
		.split('Name:')
		.map(s => s.trim())
		.filter(s => s)
		.map(s => ({
			digest: s.match(/sha256:[^\s]+/)[0],
			platform: s.split('Platform:')[1].split('\n')[0].trim()
		}))
		.reduce((o, {digest, platform}) => ({...o, [platform]: digest}), {});

const updateDockerImages = (amendCommit = false) => {
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

	return Promise.resolve(
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
		.then(() =>
			spawnAsync('docker', [
				'buildx',
				'create',
				'--name',
				'cyph_build_context'
			])
		)
		.then(() =>
			spawnAsync('docker', ['buildx', 'use', 'cyph_build_context'])
		)
		.then(() =>
			spawnAsync(
				'docker',
				[
					'buildx',
					'build',
					'--push',
					'--platform',
					Object.keys(baseImageDigests).join(','),
					'-t',
					'cyph/base:latest',
					'-f',
					'Dockerfile.tmp',
					'.'
				],
				undefined,
				undefined,
				30000
			)
		)
		.then(() => {
			fs.unlinkSync('Dockerfile.tmp');

			baseImageDigests = getImageDigests('cyph/base');
		})
		.then(() =>
			Array.from(Object.entries(dockerfileHostedImages)).reduce(
				(acc, [dockerfile, image]) =>
					acc.then(() =>
						spawnAsync(
							'docker',
							[
								'buildx',
								'build',
								'--push',
								'--platform',
								Object.keys(baseImageDigests).join(','),
								'-t',
								image,
								'-f',
								dockerfile,
								'.'
							],
							undefined,
							undefined,
							30000
						)
					),
				Promise.resolve()
			)
		)
		.then(() => {
			fs.writeFileSync(
				baseImageDigestsPath,
				JSON.stringify(baseImageDigests, undefined, '\t') + '\n'
			);

			fs.writeFileSync(
				circleciConfigPath,
				fs
					.readFileSync(circleciConfigPath)
					.toString()
					.replace(
						/image: .*/,
						`image: cyph/circleci@${
							getImageDigests('cyph/circleci')['linux/amd64']
						}`
					)
			);

			fs.writeFileSync(
				codespaceDockerfilePath,
				fs
					.readFileSync(codespaceDockerfilePath)
					.toString()
					.replace(
						/^FROM .*/,
						`FROM cyph/base@${baseImageDigests['linux/amd64']}`
					)
			);

			childProcess.spawnSync('git', [
				'commit',
				'-S',
				...(amendCommit ?
					['--amend', '--no-edit', '--no-verify'] :
					['-m', 'updatedockerimages']),
				baseImageDigestsPath,
				circleciConfigPath,
				codespaceDockerfilePath
			]);
			childProcess.spawnSync('git', ['push']);
		});
};

const waitUntilFileExists = filePath =>
	new Promise(resolve => setTimeout(resolve, 5000))
		.then(() => new Promise(resolve => fs.exists(filePath, resolve)))
		.then(exists => (exists ? undefined : waitUntilFileExists(filePath)));

process.env.DOCKER_BUILDKIT = '1';

if (!isCyphInternal && needAGSE) {
	fail('Non-Cyph-employee. AGSE unsupported.');
}
if (isWindows && needAGSE) {
	fail('AGSE not yet supported on Windows.');
}

let exitCleanup = () => {};
let initPromise = Promise.resolve();

const removeDirectory = dir => {
	if (!fs.existsSync(dir)) {
		return;
	}

	if (typeof fs.rmSync === 'function') {
		fs.rmSync(dir, {force: true, recursive: true});
	}
	else {
		fs.rmdirSync(dir, {force: true, recursive: true});
	}
};

const make = () => {
	killEverything();

	const buildLocalImage = (imageName = image) =>
		spawnAsync('docker', [
			'buildx',
			'build',
			'--load',
			'-t',
			imageName,
			'-f',
			'Dockerfile.local',
			'--build-arg',
			`BASE_DIGEST=${baseImageDigests[currentArch]}`,
			'.'
		]);

	removeDirectory('.local-docker-context/config');

	initPromise = initPromise
		.then(
			() =>
				shellScripts.setup &&
				!imageAlreadyBuilt(initImage) &&
				buildLocalImage(initImage).then(() =>
					editImage(
						shellScripts.setup,
						undefined,
						undefined,
						undefined,
						initImage
					)
				)
		)
		.then(
			() =>
				shellScripts.setup &&
				dockerCP(
					'/home/gibson/.config',
					'.local-docker-context/config',
					true,
					initImage
				)
		)
		.then(() => buildLocalImage())
		.then(() =>
			spawnAsync('docker', [
				'tag',
				`${image}:latest`,
				`${initImage}:latest`
			])
		)
		.then(() =>
			spawnAsync('docker', [
				'tag',
				`${image}:latest`,
				`${image}_original:latest`
			])
		)
		.then(() => {
			removeDirectory('.local-docker-context/config');
			return dockerCP('/node_modules', 'shared/node_modules', true);
		})
		.then(() => spawnAsync('docker', ['system', 'prune', '-f']))
		.then(() =>
			spawnAsync('docker', [
				'run',
				'--pid=host',
				'--privileged',
				'--rm',
				'docker/desktop-reclaim-space'
			])
		)
		.then(() => spawnAsync('docker', ['system', 'prune', '-f']))
		.then(() => huskySetup());

	return initPromise;
};

if (needAGSE) {
	commandAdditionalArgs.push('-p', '31337:31337/udp');

	exitCleanup = () => fs.appendFileSync(agseTempFile, '');
	initPromise = runScript(shellScripts.agseInit);
}

let makeRequired = true;

switch (args.command) {
	case 'editimage':
		editImage(`source ~/.bashrc ; ${baseShellCommandArgs[0]}`);
		break;

	case 'huskysetup':
		makeRequired = false;
		huskySetup();
		break;

	case 'kill':
		makeRequired = false;
		killEverything();
		break;

	case 'make':
		makeRequired = false;
		make();
		break;

	case 'makeclean':
		makeRequired = false;
		killEverything();
		removeImage('cyph');
		removeImage(undefined, ['--filter', 'dangling=true']);
		break;

	case 'serve':
		const base = 'http://localhost';
		const projects = [
			'backend',
			'cyph.com',
			'cyph.app',
			'docs',
			'syncfusion'
		];
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
			waitUntilFileExists(serveReadyPath).then(() =>
				fs.readFileSync(serveReadyPath).toString().trim().split(' ')
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

	case 'updatedockerimages':
		makeRequired = false;
		updateDockerImages();
		break;

	case 'websign/serve':
		makeRequired = false;

		if (fs.existsSync(webSignServeReadyPath)) {
			fs.unlinkSync(webSignServeReadyPath);
		}

		waitUntilFileExists(webSignServeReadyPath)
			.then(() => open(`file://${__dirname}/.websign.tmp/index.html`))
			.then(() => {
				fs.unlinkSync(webSignServeReadyPath);
			});
		break;

	default:
		if (!commandScript) {
			fail('fak u gooby');
		}
}

if (makeRequired && !imageAlreadyBuilt()) {
	if (args.noAutoMake) {
		fail('Image not yet built. Run `./docker.js make` first.');
	}
	else {
		console.error(
			'WARNING: Building your local development image. This may take a while.'
		);
		make();
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
			args.command === 'addlib' ||
			args.command === 'getlibs' ||
			args.command === 'updatelibs' ||
			args.command === 'verify'
	)
		.then(() => {
			switch (args.command) {
				case 'addlib':
					return editImage(shellScripts.command);

				case 'getlibs':
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
			switch (args.command) {
				case 'make':
					return spawnAsync('node', ['docker.js', 'protobuf']);

				case 'updatelibs':
					return updateDockerImages(true).then(() =>
						spawnAsync('node', [
							'docker.js',
							'notify',
							'--admins',
							'updatelibs complete'
						])
					);
			}
		});
});
