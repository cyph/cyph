#!/bin/bash

# CDN node setup script


PROMPT key
PROMPT githubToken


cd $(cd "$(dirname "$0")"; pwd)


cat > /tmp/setup.sh << EndOfMessage
#!/bin/bash

cd

echo '${key}' > key.pem
openssl dhparam -out dhparams.pem 2048

keyHash="\$(openssl rsa -in key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"
backupHash='V3Khw3OOrzNle8puKasf47gcsFk9QqKP5wy0WWodtgA='

npm install glob koa


cat > server.js <<- EOM
	#!/usr/bin/env node

	const childProcess	= require('child_process');
	const crypto		= require('crypto');
	const fs			= require('fs');
	const glob			= require('glob');
	const http2			= require('http2');
	const app			= new (require('koa'))();

	const cache			= {
		br: {
			current: {},
			files: {},
			urls: {}
		},
		gzip: {
			current: {},
			files: {},
			urls: {}
		}
	};

	const cdnPath		= './cdn/';
	const certPath		= 'cert.pem';
	const keyPath		= 'key.pem';
	const dhparamPath	= 'dhparams.pem';

	const getNewCert	= () => {
		try {
			fs.unlinkSync(certPath);
		}
		catch {}

		const ipAddress	=
			childProcess.spawnSync(
				'curl',
				['-s', 'https://checkip.amazonaws.com']
			).stdout.toString().trim()
		;

		const domains	= ['af', 'as', 'eu', 'na', 'oc', 'sa'].
			map(s => s + '.cdn.cyph.com').
			filter(d =>
				childProcess.spawnSync('getent', ['hosts', d]).stdout.
					toString().
					replace(/ .*/g, '').
					trim().
					split('\n').
					indexOf(ipAddress)
				> -1
			)
		;

		if (domains.length < 1) {
			throw new Error('No domains.');
		}

		fs.writeFileSync('sans.txt', (
			'[req]\nreq_extensions=req_ext\ndistinguished_name=dn\n\n' +
			'[dn]\nC=US\nST=Delaware\nL=Wilmington\nO=Cyph, Inc.\nCN=' + domains[0] + '\n\n' +
			'[req_ext]\nsubjectAltName=@alt_names\n\n' +
			'[alt_names]\n' +
			domains.map((d, i) => 'DNS.' + (i + 1).toString() + '=' + d).join('\n')
		));

		childProcess.spawnSync('openssl', [
			'req',
			'-new',
			'-out',
			'csr.pem',
			'-key',
			keyPath,
			'-subj',
			'/C=US/ST=Delaware/L=Wilmington/O=Cyph, Inc./CN=' + domains[0],
			'-config',
			'sans.txt'
		]);

		fs.unlinkSync('sans.txt');

		console.log(childProcess.spawnSync('certbot', [
			'certonly',
			'-n',
			'--agree-tos',
			'--expand',
			'--standalone',
			'--register-unsafely-without-email',
			'--csr',
			__dirname + '/csr.pem',
			'--fullchain-path',
			__dirname + '/' + certPath
		]).stdout.toString());

		fs.unlinkSync('csr.pem');

		for (const f of glob.sync('*_*.pem')) {
			fs.unlinkSync(f);
		}

		if (!fs.existsSync(certPath)) {
			throw new Error('No cert.');
		}
	};

	const getFileName	= (ctx, ext) => async () => new Promise((resolve, reject) => {
		if (ctx.request.path.indexOf('..') > -1) {
			reject('Invalid path.');
			return;
		}

		fs.realpath(cdnPath + ctx.request.path.slice(1) + ext, (err, path) => {
			if (err || !path) {
				reject(err);
				return;
			}

			const fileName	= path.split(process.env['HOME'] + cdnPath.slice(1))[1];

			if (fileName) {
				resolve(fileName);
				return;
			}

			reject(path);
		});
	});

	const git			= (...args) => new Promise((resolve, reject) => {
		let data		= Buffer.from([]);
		const stdout	= childProcess.spawn('git', args, {cwd: cdnPath}).stdout;

		stdout.on('data', buf => data = Buffer.concat([data, buf]));

		stdout.on('close', () => {
			stdout.removeAllListeners();
			resolve(data);
		});

		stdout.on('error', () => {
			stdout.removeAllListeners();
			reject();
		});
	});

	app.use(async ctx => {
		try {
			const cyphCtx	= {};

			ctx.set('Access-Control-Allow-Methods', 'GET');
			ctx.set('Access-Control-Allow-Origin', '*');
			ctx.set('Cache-Control', 'public, max-age=31536000');
			ctx.set('Content-Type', 'application/octet-stream');
			ctx.set(
				'Public-Key-Pins',
				'max-age=5184000; pin-sha256="\${keyHash}"; pin-sha256="\${backupHash}"'
			);
			ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubdomains');

			if (!ctx.path || ctx.path === '/') {
				ctx.set('Content-Type', 'text/plain');
				ctx.body	= 'Welcome to Cyph, lad';
				ctx.status	= 200;
				return;
			}

			if (
				(ctx.request.get('Accept-Encoding') || '').
					replace(/\s+/g, '').
					split(',').
					indexOf('br') > -1
			) {
				cyphCtx.cache		= cache.br;
				cyphCtx.getFileName	= getFileName(ctx, '.br');

				ctx.set('Content-Encoding', 'br');
			}
			else {
				cyphCtx.cache		= cache.gzip;
				cyphCtx.getFileName	= getFileName(ctx, '.gz');

				ctx.set('Content-Encoding', 'gzip');
			}


			// /.*\/current/ route

			if (ctx.path.endsWith('current')) {
				const fileName	= await cyphCtx.getFileName();

				ctx.body	= await new Promise((resolve, reject) =>
					fs.readFile(cdnPath + fileName, (err, data) => {
						if (!err && data) {
							cyphCtx.cache.current[fileName]	= data;
						}

						if (cyphCtx.cache.current[fileName]) {
							resolve(cyphCtx.cache.current[fileName]);
						}
						else {
							reject(err);
						}
					})
				);

				ctx.status	= 200;

				return;
			}


			// /\/.*/ route

			if (!cyphCtx.cache.urls[ctx.originalUrl]) {
				const hash		= ctx.originalUrl.split('?')[1];
				const fileName	= await cyphCtx.getFileName();

				if (!cyphCtx.cache.files[fileName]) {
					cyphCtx.cache.files[fileName]	= {};
				}

				if (!cyphCtx.cache.files[fileName][hash]) {
					await new Promise((resolve, reject) =>
						fs.stat(cdnPath + fileName, err => {
							if (err) {
								reject(err);
							}
							else {
								resolve();
							}
						})
					);

					const revision	= !hash ? '' : (
						(await git('log', '--pretty=format:%H %s', fileName)).toString().
							split('\n').
							map(s => s.split(' ')).
							filter(arr => arr[1] === hash).
							concat([['HEAD']])
					)[0][0];

					cyphCtx.cache.files[fileName][hash]	=
						await git('show', revision + ':' + fileName)
					;
				}

				cyphCtx.cache.urls[ctx.originalUrl]	=
					cyphCtx.cache.files[fileName][hash]
				;
			}

			ctx.body	=
				ctx.request.hostname === 'localhost' ?
					'' :
					cyphCtx.cache.urls[ctx.originalUrl]
			;

			ctx.status	= 200;
		}
		catch {
			ctx.body	= '';
			ctx.status	= 418;
		}
	});


	let server;

	(async () => { while (true) {
		while (true) {
			try {
				getNewCert();
				break;
			}
			catch (err) {
				console.error(err);
				await new Promise(resolve => setTimeout(resolve, 30000));
			}
		}

		if (server) {
			await new Promise(resolve => server.close(resolve));
		}

		server	= http2.createSecureServer(
			{
				allowHTTP1: true,
				cert: fs.readFileSync(certPath),
				key: fs.readFileSync(keyPath),
				dhparam: fs.readFileSync(dhparamPath),
				secureOptions: crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1
			},
			app.callback()
		);

		server.listen(31337);

		/* 30 days */
		await new Promise(resolve => setTimeout(resolve, 1296000000));
		await new Promise(resolve => setTimeout(resolve, 1296000000));
	} })();
EOM
chmod +x server.js


cat > cdnupdate.sh <<- EOM
	#!/bin/bash

	cd

	cachePath=" \
		url=\"https://localhost:31337/\\\\\\\$( \
			echo 'PATH' | sed 's|\.br\\\\\\\$||g' \
		)?\\\\\\\$( \
			git log -1 --pretty=format:%s 'PATH' \
		)\"; \
		\
		curl -sk \"\\\\\\\${url}\"; \
		curl -H 'Accept-Encoding: br' -sk \"\\\\\\\${url}\"; \
	"

	cachePaths () {
		echo "\\\${1}" |
			grep -P '\.br\\\$' |
			grep -vP '/current\.br\\\$' |
			xargs -IPATH -P10 bash -c "\\\${cachePath}"
	}

	getHead () {
		git reflog -1 --pretty=format:%H
	}

	while [ ! -d cdn/.git ] ; do
		rm -rf cdn 2> /dev/null
		mkdir cdn
		git clone https://${githubToken}:x-oauth-basic@github.com/cyph/cdn.git || sleep 5
	done

	if [ "\\\${1}" == 'init' ] ; then
		exit
	fi

	cd cdn

	git pull

	bash -c 'cd ; npm update ; ./server.js >> server.log' &

	head="\\\$(getHead)"

	sleep 60
	cachePaths "\\\$(git ls-files | grep -P '^cyph\.app/')"
	cachePaths "\\\$(git ls-files | grep -vP '^cyph\.app/')"

	while true ; do
		sleep 60
		git pull

		newHead="\\\$(getHead)"
		if [ "\\\${head}" == "\\\${newHead}" ] ; then
			continue
		fi

		cachePaths "\\\$(git diff --name-only "\\\${newHead}" "\\\${head}")"

		head="\\\${newHead}"
	done
EOM
chmod +x cdnupdate.sh


./cdnupdate.sh init
EndOfMessage


chmod 777 /tmp/setup.sh
/tmp/setup.sh
rm /tmp/setup.sh


echo '~/cdnupdate.sh &' >> /init.sh
