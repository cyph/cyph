#!/usr/bin/env node


const childProcess	= require('child_process');
const crypto		= require('crypto');
const fs			= require('fs');
const os			= require('os');
const path			= require('path');

const cat			= f => {
	try {
		return fs.readFileSync(f).toString().trim();
	}
	catch (_) {
		return '';
	}
};

const exec			= command => childProcess.execSync(
	command,
	{cwd: __dirname}
).toString().trim();

const spawn			= (command, args) => (
	childProcess.spawnSync(
		command,
		args,
		{cwd: __dirname}
	).stdout || ''
).toString().trim();

const spawnAsync	= (command, args) => new Promise(resolve =>
	childProcess.spawn(
		command,
		args,
		{cwd: __dirname, stdio: 'inherit'}
	).on(
		'exit',
		() => { resolve(); }
	)
);

const runScript		= script => {
	const tmpFile	= path.join(os.tmpdir(), crypto.randomBytes(32).toString('hex'));
	fs.writeFileSync(tmpFile, script);
	return spawnAsync('bash', [tmpFile]);
};


const args	= {
	command: process.argv[2],
	background: process.argv.indexOf('--background') > -1,
	simple: process.argv.indexOf('--simple') > -1,
	site: process.argv[(process.argv.indexOf('--site') + 1) || undefined]
};

const isWindows				= process.platform === 'win32';
const homeDir				= os.homedir();
const backupDir				= path.join(homeDir, '.cyphbackup');
const backupTargets			= ['gitconfig', 'gnupg', 'ssh'];
const dockerHomeDir			= '/home/gibson';
const agseRemoteAddress		= '10.0.0.42';
const agseLocalAddress		= '10.0.0.43';
const agseRemoteMAC			= cat(path.join(homeDir, '.cyph', 'agse.remote.mac'));
const agseLocalInterface	= cat(path.join(homeDir, '.cyph', 'agse.local.interface'));
const agseTempFile			= path.join(os.tmpdir(), 'balls');
const commandAdditionalArgs	= [];

const commandScriptExists	= (() => {
	try {
		fs.accessSync(path.join(__dirname, 'commands', `${args.command}.sh`));
		return true;
	}
	catch (_) {
		return false;
	}
})();

const isAgseDeploy			=
	args.command === 'deploy' &&
	!args.simple &&
	(!args.site || args.site === 'cyph.im')
;

const image					= 'cyph/' + (
	spawn('git', ['describe', '--tags', '--exact-match']) ||
	spawn('git', ['branch']).
		split('\n').
		filter(s => s && s.indexOf('*') === 0)[0].
		split(/\s+/)[1]
).toLowerCase();

const mounts				= [
	`${__dirname}:/cyph`,
	`${path.join(homeDir, '.cyph')}:${dockerHomeDir}/.cyph`,
	`${path.join(homeDir, '.gitconfig')}:${dockerHomeDir}/.gitconfig`,
	`${path.join(homeDir, '.gnupg')}:${dockerHomeDir}/.gnupg.original`,
	`${path.join(homeDir, '.ssh')}:${dockerHomeDir}/.ssh`
].map(
	s => ['-v', s]
).reduce(
	(a, b) => a.concat(b), []
);

const windowsWorkaround		= !isWindows ? '' : `
	sudo mv /bin/ln /bin/ln.old
	echo '
		#!/bin/bash

		if [ "\${1}" != '-s' -o "\${#}" != '3' ] ; then
			/bin/ln.old "\${@}"
		elif [ -f "\${2}" ] ; then
			cp -f "\${2}" "\${3}"
		else
			rm -rf "\${3}" 2> /dev/null
			mkdir "\${3}"
			sudo mount -o bind "\${2}" "\${3}"
		fi
	' |
		sudo tee -a /bin/ln > /dev/null
	sudo chmod +x /bin/ln
`;

const shellScripts			= {
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
			sudo apt-get -y --force-yes update
			sudo apt-get -y --force-yes upgrade

			sudo gem update

			emsdk update
			emsdk install latest
			emsdk uninstall $(emsdk list | grep INSTALLED | grep node | awk "{print $2}")
			emsdk activate latest

			if [ "$(command -v gcloud)" ] ; then gcloud components update --quiet ; fi

			touch ~/.updated
		`,
		condition: `
			[ ! -f ~/.updated ] || test "$(find ~/.updated -mtime +3)"
		`
	},
	command: `
		source ~/.bashrc
		${windowsWorkaround}
		/cyph/commands/${args.command}.sh ${
			process.argv.
				slice(3).
				filter(s => s !== '--background').
				map(s => s.indexOf("'") ? `"${s}"` : `'${s}'`).
				join(' ')
		}
	`,
	libUpdate: {
		command: `
			source ~/.bashrc
			${windowsWorkaround}
			/cyph/commands/getlibs.sh

			rm -rf \${GOPATH}/src 2> /dev/null
			mkdir -p \${GOPATH}/src
			for f in $(find /cyph/shared/lib/go -mindepth 1 -maxdepth 1 -type d) ; do
				cp -rf \${f} \${GOPATH}/src/$(echo "\${f}" | perl -pe 's/.*\\///g') > /dev/null 2>&1
			done
			for f in $(find /cyph/shared/lib/go -mindepth 1 -maxdepth 4 -type d) ; do
				go install $(echo "\${f}" | sed 's|/cyph/shared/lib/go/||') > /dev/null 2>&1
			done
		`,
		condition: `
			! cmp /cyph/shared/lib/js/yarn.lock /node_modules/yarn.lock > /dev/null 2>&1 ||
			! cmp /cyph/shared/js/node_modules/yarn.lock /node_modules/yarn.lock > /dev/null 2>&1
		`
	},
	setup: `
		source ~/.bashrc

		tns error-reporting disable
		tns usage-reporting disable

		~/google-cloud-sdk/install.sh \
			--additional-components app-engine-go \
			--command-completion true \
			--path-update true \
			--rc-path ~/.bashrc \
			--usage-reporting false
		source ~/.bashrc
		gcloud components update --quiet
		gcloud init
	`,
	stopServe: `
		rm -rf \\
			*/.build.yaml \\
			*/.index.html \\
			cyph.com/blog \\
			shared/js/docs \\
			shared/js/*/pack \\
			$(find shared/css -name '*.css' -or -name '*.map') \\
			$(find shared/js -name '*.js' -or -name '*.map')
	`
};


const backup			= () => {
	if (isWindows) {
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
		spawn('cp', ['-a', path.join(homeDir, `.${d}`), path.join(backupDir, d)]);
	}

	for (const d of fs.readdirSync(path.join(homeDir, '.cyph')).filter(d => d !== 'cdn')) {
		spawn('cp', ['-a', path.join(homeDir, '.cyph', d), path.join(backupDir, 'cyph', d)]);
	}

	childProcess.spawnSync('git', ['add', '.'], {cwd: backupDir});
	childProcess.spawnSync(
		'git',
		['commit', '--no-gpg-sign', '-a', '-m', 'backup'],
		{cwd: backupDir}
	);
};

const containerName		= command => `${image}_${command}`.replace(/\//g, '_');

const dockerRun			= (command, name, background, noCleanup, additionalArgs, getOutput) => {
	const processArgs	= [
		'run',
		getOutput ? '-i' : '-it'
	].concat(
		isWindows ? ['--privileged'] : []
	).concat(
		name ? [`--name=${name}`] : []
	).concat(
		background ? [`-d`] : []
	).concat(
		!noCleanup ? [`--rm=true`] : []
	).concat(
		mounts
	).concat(
		additionalArgs || []
	).concat([
		image,
		'bash',
		'-c',
		command
	]);

	if (getOutput) {
		return spawn('docker', processArgs);
	}
	else {
		return spawnAsync('docker', processArgs);
	}
};

const editImage			= (command, condition) => Promise.resolve().then(() => {
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
		return;
	}

	const tmpContainer	= containerName('tmp');

	spawn('docker', ['rm', '-f', tmpContainer]);

	return dockerRun(command, tmpContainer, undefined, true).then(() =>
		spawnAsync('docker', ['commit', tmpContainer, image])
	).then(() =>
		spawnAsync('docker', ['rm', '-f', tmpContainer])
	);
});

const killContainer		= name => {
	for (
		const pid of spawn('docker', ['ps', '-a']).
			split('\n').
			slice(1).
			filter(s => s.indexOf(name) > -1).
			map(s => s.split(/\s+/)[0])
	) {
		console.log(spawn('docker', ['kill', '-s', '9', pid]));
		console.log(spawn('docker', ['rm', '-f', pid]));
	}
};

const killEverything	= () => killContainer('cyph');

const pullUpdates		= () => {
	return editImage(shellScripts.aptUpdate.command, shellScripts.aptUpdate.condition).then(() =>
		editImage(shellScripts.libUpdate.command, shellScripts.libUpdate.condition)
	);
};

const removeImage		= (name, opts) => {
	for (
		const imageId of spawn('docker', ['images'].concat(opts || [])).
			split('\n').
			slice(1).
			filter(s => name ? s.indexOf(name) > -1 : true).
			map(s => s.split(/\s+/)[2])
	) {
		console.log(spawn('docker', ['rmi', '-f', imageId]));
	}
};

const updateCircleCI	= () => {
	fs.writeFileSync(
		'Dockerfile.tmp',
		fs.readFileSync('Dockerfile').
			toString().
			split('\n').
			filter(s => !s.startsWith('VOLUME')).
			join('\n').
			replace('WORKDIR /cyph/commands', 'WORKDIR /cyph').
			replace(/#CIRCLECI:/g, '').
			replace(
				/GETLIBS_BASE64/g,
				new Buffer(
					fs.readFileSync('commands/getlibs.sh').
						toString().
						split('\n').
						filter(s => s.indexOf('nativePlugins') < 0).
						join('\n')
				).toString('base64')
			).
			replace(
				/LIBCLONE_BASE64/g,
				fs.readFileSync(
					'commands/libclone.sh'
				).toString('base64')
			).
			replace(
				/FBS_BASE64/g,
				fs.readFileSync(
					'shared/lib/js/module_locks/firebase-server/package.json'
				).toString('base64')
			).
			replace(
				/TSN_BASE64/g,
				fs.readFileSync(
					'shared/lib/js/module_locks/ts-node/package.json'
				).toString('base64')
			).
			replace(
				/TSL_BASE64/g,
				fs.readFileSync(
					'shared/lib/js/module_locks/tslint/package.json'
				).toString('base64')
			).
			replace(
				/PACKAGE_BASE64/g,
				fs.readFileSync(
					'shared/lib/js/package.json'
				).toString('base64')
			)
	);

	spawnAsync('docker', [
		'build',
		'-t',
		'cyph/circleci:latest',
		'-f',
		'Dockerfile.tmp',
		'.'
	]).then(() =>
		spawnAsync('docker', ['push', 'cyph/circleci:latest'])
	).then(() => {
		fs.unlinkSync('Dockerfile.tmp');
	});
};


if (isWindows && isAgseDeploy) {
	throw new Error('AGSE not yet supported on Windows.');
}

let exitCleanup	= () => {};
let initPromise	= Promise.resolve();

switch (args.command) {
	case 'deploy':
		if (!isAgseDeploy) {
			break;
		}

		commandAdditionalArgs.push('-p');
		commandAdditionalArgs.push('31337:31337/udp');

		exitCleanup	= () => fs.appendFileSync(agseTempFile);
		initPromise	= runScript(shellScripts.agseInit);
		break;

	case 'kill':
		killEverything();
		break;

	case 'make':
		killEverything();
		initPromise	= spawnAsync('docker', ['build', '-t', image, '.']).then(() =>
			pullUpdates()
		).then(() =>
			editImage(shellScripts.setup)
		);
		break;

	case 'makeclean':
		killEverything();
		removeImage('cyph');
		removeImage('google/cloud-sdk');
		removeImage(undefined, ['--filter', 'dangling=true']);
		break;

	case 'serve':
		commandAdditionalArgs.push('-p');
		commandAdditionalArgs.push('42000:5000');
		commandAdditionalArgs.push('-p');
		commandAdditionalArgs.push('42001:5001');
		commandAdditionalArgs.push('-p');
		commandAdditionalArgs.push('42002:5002');
		commandAdditionalArgs.push('-p');
		commandAdditionalArgs.push('44000:44000');

		const base		= 'http://localhost';
		const projects	= ['backend', 'cyph.com', 'cyph.im'];

		for (let i = 0 ; i < projects.length ; ++i) {
			console.log(`${projects[i]}: ${base}:4200${i}`);
		}

		console.log(`docs: ${base}:42001/js/docs/index.html\n\n`);
		break;

	case 'stopserve':
		killContainer(containerName('serve'));

		if (isWindows) {
			break;
		}

		exec(shellScripts.stopServe);
		break;

	default:
		if (!commandScriptExists) {
			throw new Error('fak u gooby');
		}
}

process.on('exit', exitCleanup);
process.on('SIGINT', exitCleanup);
process.on('uncaughtException', exitCleanup);

initPromise.then(() => {
	if (!commandScriptExists) {
		return;
	}

	backup();
	killContainer(containerName(args.command));

	pullUpdates().then(() => {
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
	}).then(() => {
		if (args.command === 'updatelibs') {
			updateCircleCI();
		}
	});
});
