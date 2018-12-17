import * as Comlink from 'comlinkjs';
import {potassiumUtil} from './crypto/potassium/potassium-util';
import {env} from './env';
import {IThread} from './ithread';
import {stringify} from './util/serialization';
import {resolvable} from './util/wait';


/** @inheritDoc */
export class Thread<T> implements IThread<T> {
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

		/* RPC */

		importScripts('/assets/node_modules/comlinkjs/umd/comlink.js');

		/* Allow destroying the Thread object from within the thread */

		/* This is DedicatedWorkerGlobalScope.postMessage(), not Window.postMessage() */
		/* tslint:disable-next-line:no-unbound-method */
		self.close	= () => (<any> self).postMessage('cyphThreadClose');


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

		threadSetupVars					= undefined;
		(<any> self).threadSetupVars	= undefined;
	}


	/** @ignore */
	private alive: boolean			= true;

	/** @ignore */
	private readonly apiResolver	= resolvable<T>();

	/** @ignore */
	private readonly worker: Worker;

	/** @inheritDoc */
	public readonly api	= this.apiResolver.promise;

	/** @inheritDoc */
	public isAlive () : boolean {
		return this.alive;
	}

	/** @inheritDoc */
	public postMessage (o: any) : void {
		if (this.alive) {
			/* tslint:disable-next-line:deprecation */
			this.worker.postMessage(o);
		}
	}

	/** @inheritDoc */
	public stop () : void {
		if (this.alive) {
			this.worker.terminate();
		}

		this.alive	= false;
	}

	/**
	 * @param f Function to run in the new thread.
	 * @param locals Local data to pass in to the new thread.
	 */
	constructor (f: Function, locals: any = {}) {
		const seedBytes	= potassiumUtil.randomBytes(32);

		const threadSetupVars	= {
			accountRoot,
			isLocalEnv: env.isLocalEnv,
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
			try {
				self.threadSetupVars = ${stringify(threadSetupVars)};
				${
					/* tslint:disable-next-line:no-unbound-method */
					Thread.stringifyFunction(Thread.threadEnvSetup)
				}

				self.onmessage	= function (e) {
					self.threadLocals	= e.data;
					self.onmessage		= undefined;
					e					= undefined;

					${Thread.stringifyFunction(f)}

					self.postMessage('cyphThreadRunning');
				};

				self.sodium.ready.then(function () {
					self.postMessage('cyphThreadReady');
				}).catch(function (err) {
					self.postMessage({cyphThreadError: err && err.message});
				});
			}
			catch (err) {
				self.postMessage({cyphThreadError: err && err.message});
			}
		`;

		for (let i = 0 ; i < threadSetupVars.seed.length ; ++i) {
			seedBytes[i]			= 0;
			threadSetupVars.seed[i]	= 0;
		}

		const blobURL	= URL.createObjectURL(
			new Blob([threadBody], {type: 'application/javascript'})
		);

		try {
			this.worker	= new Worker(blobURL);
		}
		catch (err) {
			if (!env.isCordova) {
				throw err;
			}

			this.worker	= new Worker('/worker.js');

			/* tslint:disable-next-line:deprecation */
			this.worker.postMessage(threadBody);
		}


		this.worker.onmessage	= (e: MessageEvent) => {
			if (e.data === 'cyphThreadReady') {
				try {
					URL.revokeObjectURL(blobURL);
				}
				catch {}

				/* tslint:disable-next-line:deprecation */
				this.worker.postMessage(locals);
			}
			else if (e.data === 'cyphThreadRunning') {
				/* tslint:disable-next-line:no-unnecessary-type-assertion */
				this.apiResolver.resolve(<any> Comlink.proxy(this.worker));
			}
			else if (e.data === 'cyphThreadClose') {
				this.stop();
			}
			else if (typeof e.data === 'object' && 'cyphThreadError' in e.data) {
				throw new Error(`Thread error: ${(e.data.cyphThreadError || '').toString()}`);
			}
		};
	}
}
