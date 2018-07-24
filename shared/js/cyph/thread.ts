import {potassiumUtil} from './crypto/potassium/potassium-util';
import {env} from './env';
import {eventManager} from './event-manager';
import {IThread} from './ithread';
import {stringify} from './util/serialization';
import {uuid} from './util/uuid';


/** @inheritDoc */
export class Thread implements IThread {
	/** @ignore */
	private static stringifyFunction (f: Function) : string {
		const s: string	= f.toString();
		return s.slice(s.indexOf('{')).replace(/use strict/g, '');
	}

	/** @ignore */
	private static threadEnvSetup () : void {
		let threadSetupVars: any	= (<any> self).threadSetupVars;

		/* Inherit these from main thread */

		(<any> self).accountRoot		= threadSetupVars.accountRoot;
		(<any> self).locationData		= threadSetupVars.locationData;
		(<any> self).navigatorData		= threadSetupVars.navigatorData;
		(<any> self).translations		= threadSetupVars.translations;


		/* Wrapper to make importScripts work in local dev environments
			and block it in prod (because of WebSign packing) */

		if (threadSetupVars.isLocalEnv) {
			const oldImportScripts	= importScripts;
			importScripts			= (script: string) => {
				oldImportScripts(`${
					(<any> self).locationData.protocol
				}//${
					(<any> self).locationData.host
				}${
					script
				}?${
					/* tslint:disable-next-line:ban */
					Date.now().toString()
				}`);
			};
		}
		else {
			importScripts			= (script: string) => {
				throw new Error(`Cannot load external script ${script}.`);
			};
		}


		/* Normalisation to increase compatibility with web libraries */

		importScripts('/assets/node_modules/core-js/client/shim.js');
		importScripts('/assets/js/standalone/global.js');
		/* Import when needed: /assets/js/standalone/node-polyfills.js */


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

		importScripts('/assets/js/cyph/crypto/web-crypto-polyfill.js');
		(<any> self).webCryptoPolyfill(new Uint8Array(threadSetupVars.seed));
		for (let i = 0 ; i < threadSetupVars.seed.length ; ++i) {
			threadSetupVars.seed[i]	= 0;
		}
		importScripts('/assets/node_modules/libsodium/dist/browsers-sumo/sodium.js');

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
		return this.worker !== undefined;
	}

	/** @inheritDoc */
	public postMessage (o: any) : void {
		if (this.worker) {
			/* tslint:disable-next-line:deprecation */
			this.worker.postMessage(o);
		}
	}

	/**
	 * Starts worker.
	 * @param f Function to run in the new thread.
	 * @param locals Local data to pass in to the new thread.
	 * @param onmessage Handler for messages from the thread.
	 */
	public async start (
		f: Function,
		locals: any = {},
		onmessage: (e: MessageEvent) => any = () => {}
	) {
		const seedBytes	= potassiumUtil.randomBytes(32);

		const threadSetupVars	= {
			accountRoot,
			isLocalEnv: env.environment.local,
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
			seed: Array.from(seedBytes),
			translations
		};

		const threadBody	= `
			var threadSetupVars = ${stringify(threadSetupVars)};
			${
				/* tslint:disable-next-line:no-unbound-method */
				Thread.stringifyFunction(Thread.threadEnvSetup)
			}

			self.onmessage	= function (e) {
				self.locals		= e.data;
				self.onmessage	= undefined;
				e				= undefined;

				${Thread.stringifyFunction(f)}
				${
					/* tslint:disable-next-line:no-unbound-method */
					Thread.stringifyFunction(Thread.threadPostSetup)
				}
			};

			self.sodium.ready.then(function () {
				self.postMessage('ready');
			});
		`;

		for (let i = 0 ; i < threadSetupVars.seed.length ; ++i) {
			seedBytes[i]			= 0;
			threadSetupVars.seed[i]	= 0;
		}

		const blobURL	= URL.createObjectURL(
			new Blob([threadBody], {type: 'application/javascript'})
		);

		let workerFileEntry: any|undefined;

		try {
			this.worker	= new Worker(blobURL);
		}
		catch (err) {
			if (!env.isCordova) {
				throw err;
			}

			this.worker	= new Worker(await new Promise<string>((resolve, reject) => {
				(<any> self).resolveLocalFileSystemURL(
					(
						(<any> self).cordova.file.tempDirectory ||
						(<any> self).cordova.file.cacheDirectory
					),
					(dirEntry: any) => {
						dirEntry.getFile(
							`${uuid()}.js`,
							{create: true, exclusive: false},
							(fileEntry: any) => {
								fileEntry.createWriter((fileWriter: any) => {
									fileWriter.onerror		= reject;

									fileWriter.onwriteend	= () => {
										workerFileEntry	= fileEntry;

										try {
											resolve(fileEntry.toInternalURL());
										}
										catch (fileEntryErr) {
											reject(fileEntryErr);
											fileEntry.remove();
										}
									};

									fileWriter.write(new Blob([threadBody], {type: 'text/plain'}));
								});
							},
							reject
						);
					},
					reject
				);
			}));
		}


		const worker	= this.worker;

		worker.onmessage	= (e: MessageEvent) => {
			if (e.data === 'ready') {
				try {
					URL.revokeObjectURL(blobURL);
				}
				catch {}

				if (workerFileEntry) {
					try {
						workerFileEntry.remove();
					}
					catch {}
				}

				/* tslint:disable-next-line:deprecation */
				worker.postMessage(locals);
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

	/** @inheritDoc */
	public stop () : void {
		if (this.worker) {
			this.worker.terminate();
		}

		this.worker	= undefined;

		eventManager.threads.delete(this);
	}

	constructor () {}
}
