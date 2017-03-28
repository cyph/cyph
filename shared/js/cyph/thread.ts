import {config} from './config';
import {env} from './env';
import {eventManager} from './event-manager';
import {IThread} from './ithread';
import {util} from './util';


/** @inheritDoc */
export class Thread implements IThread {
	/** @ignore */
	private static stringifyFunction (f: Function) : string {
		const s: string	= f.toString();
		return s.slice(s.indexOf('{'));
	}

	/** @ignore */
	private static threadEnvSetup (threadSetupVars: any, importScripts: Function) : void {
		/* Inherit these from main thread */

		(<any> self).customBuild		= threadSetupVars.customBuild;
		(<any> self).customBuildFavicon	= threadSetupVars.customBuildFavicon;
		(<any> self).locationData		= threadSetupVars.locationData;
		(<any> self).navigatorData		= threadSetupVars.navigatorData;
		(<any> self).translations		= threadSetupVars.translations;


		/* Wrapper to make importScripts work in local dev environments
			(not used in prod because of WebSign packing) */

		const oldImportScripts	= importScripts;
		importScripts			= (script: string) => oldImportScripts(
			`${(<any> self).locationData.protocol}//${(<any> self).locationData.host}${script}`
		);


		/* Normalisation to increase compatibility with web libraries */

		importScripts('/lib/js/base.js');
		importScripts('/js/preload/global.js');


		/* Allow destroying the Thread object from within the thread */

		/* This is DedicatedWorkerGlobalScope.postMessage(), not Window.postMessage() */
		/* tslint:disable-next-line:no-unbound-method */
		self.close	= () => (<any> self).postMessage('close');


		/* Polyfills */

		/* tslint:disable-next-line:strict-type-predicates */
		if (typeof console === 'undefined') {
			console	= <any> {
				assert: () => {},
				clear: () => {},
				count: () => {},
				debug: () => {},
				dir: () => {},
				dirxml: () => {},
				dump: () => {},
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

		try {
			crypto.getRandomValues(new Uint8Array(1));
		}
		catch (_) {
			/* Some browsers only expose crypto in the main thread;
				as a workaround, the main thread's crypto instance
				is used to seed a different CSPRNG here */

			crypto	= (() => {
				const key		= new Uint8Array(threadSetupVars.seed);
				const nonce		= new Uint32Array(2);
				let isActive	= false;

				return {
					getRandomValues: (array: ArrayBufferView) => {
						if (
							typeof (<any> self).sodium !== 'undefined' &&
							(<any> self).sodium.crypto_stream_chacha20
						) {
							isActive	= true;
						}
						else if (!isActive) {
							return array;
						}
						else {
							throw new Error('No CSPRNG found.');
						}

						++nonce[nonce[0] === 4294967295 ? 0 : 1];

						const newBytes: Uint8Array	= (<any> self).sodium.crypto_stream_chacha20(
							array.byteLength,
							key,
							new Uint8Array(nonce.buffer)
						);

						new Uint8Array(array.buffer).set(newBytes);
						(<any> self).sodium.memzero(newBytes);

						return array;
					},

					subtle: <SubtleCrypto> {}
				};
			})();
		}

		(<any> self).crypto	= crypto;

		importScripts('/lib/js/node_modules/libsodium/dist/browsers-sumo/combined/sodium.js');
		(<any> self).sodium.memzero(threadSetupVars.seed);

		importScripts('/js/cyph/base.js');

		threadSetupVars	= undefined;
	}

	/** @ignore */
	private static threadPostSetup () : void {
		if (!self.onmessage && onthreadmessage) {
			self.onmessage	= onthreadmessage;
		}
	}


	/** @ignore */
	private worker?: Worker;

	/** @inheritDoc */
	public isAlive () : boolean {
		return !!this.worker;
	}

	/** @inheritDoc */
	public postMessage (o: any) : void {
		if (this.worker) {
			this.worker.postMessage(o);
		}
	}

	/** @inheritDoc */
	public stop () : void {
		if (this.worker) {
			this.worker.terminate();
		}

		this.worker	= undefined;

		eventManager.threads.delete(this);
	}

	/**
	 * @param f Function to run in the new thread.
	 * @param locals Local data to pass in to the new thread.
	 * @param onmessage Handler for messages from the thread.
	 */
	constructor (
		f: Function,
		locals: any = {},
		onmessage: (e: MessageEvent) => any = () => {}
	) {
		const seedBytes	= new Uint8Array(32);
		crypto.getRandomValues(seedBytes);

		const threadSetupVars	= {
			customBuild,
			customBuildFavicon,
			translations,
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
				language: env.fullLanguage,
				userAgent: env.userAgent
			},
			seed: Array.from(seedBytes)
		};

		const callbackId	= 'NewThread-' + util.generateGuid();

		const threadBody	= `
			var threadSetupVars = ${JSON.stringify(threadSetupVars)};
			${
				/* tslint:disable-next-line:no-unbound-method */
				Thread.stringifyFunction(Thread.threadEnvSetup)
			}

			eventManager.one('${callbackId}').then(function (locals) {
				${Thread.stringifyFunction(f)}
				${
					/* tslint:disable-next-line:no-unbound-method */
					Thread.stringifyFunction(Thread.threadPostSetup)
				}
			});

			self.postMessage('ready');
		`;

		for (let i = 0 ; i < threadSetupVars.seed.length ; ++i) {
			seedBytes[i]			= 0;
			threadSetupVars.seed[i]	= 0;
		}

		let blobUrl: string;

		try {
			blobUrl	= URL.createObjectURL(
				new Blob([threadBody], {type: 'application/javascript'})
			);

			try {
				this.worker	= new Worker(blobUrl);
			}
			catch (err) {
				if (this.worker) {
					this.worker.terminate();
				}
				throw err;
			}
		}
		catch (_) {
			this.worker	= new Worker(config.webSignConfig.workerHelper);
			this.worker.postMessage(threadBody);
		}


		this.worker.onmessage	= (e: MessageEvent) => {
			if (e.data === 'ready') {
				try {
					URL.revokeObjectURL(blobUrl);
				}
				catch (_) {}

				eventManager.trigger(callbackId, locals, true);
			}
			else if (e.data === 'close') {
				this.stop();
			}
			else if (e.data && e.data.isThreadEvent) {
				eventManager.trigger(e.data.event, e.data.data);
			}
			else {
				onmessage(e);
			}
		};

		eventManager.threads.add(this);
	}
}
