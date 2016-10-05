import {Config} from './config';
import {Env} from './env';
import {EventManager} from './eventmanager';
import {Util} from './util';


export class Thread {
	private static BlobBuilder: any	=
		self['BlobBuilder'] ||
		self['WebKitBlobBuilder'] ||
		self['MozBlobBuilder']
	;

	private static stringifyFunction (f: Function) : string {
		const s: string	= f.toString();
		return s.slice(s.indexOf('{'));
	}

	private static threadEnvSetup (threadSetupVars: any, importScripts: Function) : void {
		/* Inherit these from main thread */

		self['customBuild']			= threadSetupVars.customBuild;
		self['customBuildFavicon']	= threadSetupVars.customBuildFavicon;
		self['locationData']		= threadSetupVars.locationData;
		self['navigatorData']		= threadSetupVars.navigatorData;


		/* Wrapper to make importScripts work in local dev environments
			(not used in prod because of WebSign packing) */

		const oldImportScripts	= importScripts;
		importScripts			= (script: string) => oldImportScripts(
			`${self['locationData'].protocol}//${self['locationData'].host}` +
			script
		);


		/* Normalisation to increase compatibility with Web libraries */

		importScripts('/lib/js/base.js');
		importScripts('/js/cyph/base.js');
		self['Cyph']	= self['Base'];
		self['Base']	= undefined;


		/* Allow destroying the Thread object from within the thread */

		self.close	= () => self.postMessage('close', undefined);


		/* Polyfills */

		if (typeof console === 'undefined') {
			console	= {
				assert: () => {},
				clear: () => {},
				count: () => {},
				debug: () => {},
				dir: () => {},
				dirxml: () => {},
				error: () => {},
				exception: () => {},
				group: () => {},
				groupCollapsed: () => {},
				groupEnd: () => {},
				info: () => {},
				log: () => {},
				msIsIndependentlyComposed: () => false,
				profile: () => {},
				profileEnd: () => {},
				select: () => {},
				table: () => {},
				time: () => {},
				timeEnd: () => {},
				trace: () => {},
				warn: () => {}
			};
		}

		if (typeof atob === 'undefined' || typeof btoa === 'undefined') {
			importScripts('/lib/js/davidchambers/base64.js/base64.min.js');
		}

		if (typeof crypto === 'undefined' && 'msCrypto' in self) {
			crypto	= self['msCrypto'];
		}
		try {
			crypto.getRandomValues(new Uint8Array(1));
		}
		catch (_) {
			/* Firefox only exposes crypto in the main thread;
				as a workaround, the main thread's crypto instance
				is used to seed a different CSPRNG here */

			crypto	= (() => {
				const key		= new Uint8Array(threadSetupVars.seed);
				const nonce		= new Uint32Array(2);
				let isActive	= false;

				return {
					getRandomValues: array => {
						const sodium	= self['sodium'];

						if (sodium && sodium.crypto_stream_chacha20) {
							isActive	= true;
						}
						else if (!isActive) {
							return array;
						}
						else {
							throw new Error('No CSPRNG found.');
						}

						++nonce[nonce[0] === 4294967295 ? 0 : 1];

						const newBytes: Uint8Array	= sodium.crypto_stream_chacha20(
							array.byteLength,
							key,
							new Uint8Array(nonce.buffer)
						);

						new Uint8Array(array.buffer).set(newBytes);
						sodium.memzero(newBytes);

						return array;
					},

					subtle: null
				};
			})();
		}

		(<any> self)['crypto']	= crypto;

		importScripts('/lib/js/crypto/libsodium/dist/browsers-sumo/combined/sodium.min.js');
		self['sodium'].memzero(threadSetupVars.seed);

		importScripts('/lib/js/crypto/mceliece/dist/mceliece.js');
		importScripts('/lib/js/crypto/ntru/dist/ntru.js');
		importScripts('/lib/js/crypto/rlwe/dist/rlwe.js');
		importScripts('/lib/js/crypto/supersphincs/dist/supersphincs.js');

		importScripts('/lib/js/firebase/firebase.js');

		threadSetupVars	= null;
	}

	private static threadPostSetup () : void {
		if (!self.onmessage) {
			self.onmessage	= onthreadmessage;
		}
	}


	private worker: Worker;

	public isAlive () : boolean {
		return !!this.worker;
	}

	public postMessage (o: any) : void {
		if (this.worker) {
			this.worker.postMessage(o);
		}
	}

	public stop () : void {
		if (this.worker) {
			this.worker.terminate();
		}

		this.worker	= null;

		EventManager.threads	= EventManager.threads.filter(t => t !== this);
	}

	/**
	 * @param f Function to run in the new thread.
	 * @param locals Local data to pass in to the new thread.
	 * @param onmessage Handler for messages from the thread.
	 */
	public constructor (
		f: Function,
		locals: any = {},
		onmessage: (e: MessageEvent) => any = e => {}
	) {
		const seedBytes	= new Uint8Array(32);
		crypto.getRandomValues(seedBytes);

		const threadSetupVars	= {
			customBuild,
			customBuildFavicon,
			locationData: {
				hash: locationData.hash,
				host: locationData.host,
				hostname: locationData.hostname,
				href: locationData.href,
				pathname: locationData.pathname,
				port: locationData.port,
				protocol: locationData.protocol,
				search: locationData.search
			},
			navigatorData: {
				language: Env.fullLanguage,
				userAgent: Env.userAgent
			},
			seed: Array.prototype.slice.apply(seedBytes)
		};

		const callbackId: string	= 'NewThread-' + Util.generateGuid();

		const threadBody: string	= `
			var threadSetupVars = ${JSON.stringify(threadSetupVars)};
			${Thread.stringifyFunction(Thread.threadEnvSetup)}

			Cyph.EventManager.one(
				'${callbackId}',
				function (locals) {
					${Thread.stringifyFunction(f)}
					${Thread.stringifyFunction(Thread.threadPostSetup)}
				}
			);

			self.postMessage('ready');
		`;

		for (let i = 0 ; i < threadSetupVars.seed.length ; ++i) {
			seedBytes[i]			= 0;
			threadSetupVars.seed[i]	= 0;
		}

		let blob: Blob;
		let blobUrl: string;

		try {
			try {
				blob	= new Blob([threadBody], {type: 'application/javascript'});
			}
			catch (_) {
				const blobBuilder	= new Thread.BlobBuilder();
				blobBuilder.append(threadBody);

				blob	= blobBuilder.getBlob();
			}

			try {
				blobUrl		= URL.createObjectURL(blob);
				this.worker	= new Worker(blobUrl);
			}
			catch (err) {
				this.worker.terminate();
				throw err;
			}
		}
		catch (_) {
			this.worker	= new Worker(Config.webSignConfig.workerHelper);
			this.worker.postMessage(threadBody);
		}


		this.worker.onmessage	= (e: MessageEvent) => {
			if (e.data === 'ready') {
				try {
					URL.revokeObjectURL(blobUrl);
				}
				catch (_) {}

				EventManager.trigger(callbackId, locals);
			}
			else if (e.data === 'close') {
				this.stop();
			}
			else if (e.data && e.data['isThreadEvent']) {
				EventManager.trigger(e.data.event, e.data.data);
			}
			else {
				onmessage(e);
			}
		};

		EventManager.threads.push(this);
	}
}
