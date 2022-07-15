import * as Comlink from 'comlink';
import {potassiumUtil} from './crypto/potassium/potassium-util';
import {env} from './env';
import {environment} from './environment';
import {IThread} from './ithread';
import {stringify} from './util/serialization';
import {resolvable} from './util/wait/resolvable';

/** @inheritDoc */
export class Thread<T> implements IThread<T> {
	/** @ignore */
	private static stringifyFunction (f: () => void) : string {
		const s = f.toString();
		return s.slice(s.indexOf('{')).replace(/use strict/g, '');
	}

	/** @ignore */
	private static threadEnvSetup () : void {
		let threadSetupVars = (<any> self).threadSetupVars;

		/* Inherit these from main thread */

		(<any> self).burnerRoot = threadSetupVars.burnerRoot;
		(<any> self).locationData = threadSetupVars.locationData;
		(<any> self).mainThreadEnvironment =
			threadSetupVars.mainThreadEnvironment;
		(<any> self).navigatorData = threadSetupVars.navigatorData;
		(<any> self).translations = threadSetupVars.translations;

		/* Wrapper to make importScripts work in local dev environments
			and block it in prod (because of WebSign packing) */

		if (threadSetupVars.isLocalEnv) {
			const oldImportScripts = importScripts;
			importScripts = script => {
				oldImportScripts(
					`${
						script.startsWith(
							`${(<any> self).locationData.protocol}//`
						) ?
							script :
							`${(<any> self).locationData.protocol}//${
								(<any> self).locationData.host
							}${script}`
					}?${
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						Date.now().toString()
					}`
				);
			};
		}
		else {
			importScripts = script => {
				throw new Error(`Cannot load external script ${script}.`);
			};
		}

		/* Global namespace normalization and TypeScript helpers */

		importScripts('/assets/node_modules/core-js-bundle/minified.js');
		importScripts('/assets/node_modules/regenerator-runtime/runtime.js');
		importScripts('/assets/node_modules/tslib/tslib.js');
		importScripts('/assets/js/babel.js');
		importScripts('/assets/js/standalone/global.js');
		/* Import when needed: /assets/js/standalone/node-polyfills.js */

		/* RPC */

		importScripts('/assets/node_modules/comlink/dist/umd/comlink.js');

		/* Allow destroying the Thread object from within the thread */

		/* This is DedicatedWorkerGlobalScope.postMessage(), not Window.postMessage() */
		/* eslint-disable-next-line @typescript-eslint/unbound-method */
		self.close = () => (<any> self).postMessage('cyphThreadClose');

		/* Polyfills */

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof console === 'undefined') {
			console = <any> {
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
		for (let i = 0; i < threadSetupVars.seed.length; ++i) {
			threadSetupVars.seed[i] = 0;
		}
		importScripts(
			'/assets/node_modules/libsodium-sumo/dist/modules-sumo/libsodium-sumo.js'
		);
		importScripts(
			'/assets/node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js'
		);

		threadSetupVars = undefined;
		(<any> self).threadSetupVars = undefined;
	}

	/** @ignore */
	private alive: boolean = true;

	/** @ignore */
	private readonly apiResolver = resolvable<T>();

	/** @ignore */
	private readonly worker: Worker;

	/** @inheritDoc */
	public readonly api = this.apiResolver.promise;

	/** @inheritDoc */
	public isAlive () : boolean {
		return this.alive;
	}

	/** @inheritDoc */
	public postMessage (o: any) : void {
		if (this.alive) {
			/* eslint-disable-next-line import/no-deprecated */
			this.worker.postMessage(o);
		}
	}

	/** @inheritDoc */
	public stop () : void {
		if (this.alive) {
			this.worker.terminate();
		}

		this.alive = false;
	}

	/**
	 * @param name Human-readable name of the new thread.
	 * @param f Function to run in the new thread.
	 * @param locals Local data to pass in to the new thread.
	 */
	constructor (name: string, f: () => void, locals: any = {}) {
		const seedBytes = potassiumUtil.randomBytes(32);

		const threadSetupVars = {
			burnerRoot,
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
			mainThreadEnvironment: environment,
			navigatorData: {
				language: env.fullLanguage,
				userAgent: env.userAgent
			},
			seed: Array.from(seedBytes),
			translations
		};

		const threadBody = `
			try {
				self.threadSetupVars = ${stringify(threadSetupVars)};
				${
					/* eslint-disable-next-line @typescript-eslint/unbound-method */
					Thread.stringifyFunction(Thread.threadEnvSetup)
				}

				self.onmessage = function (e) {
					self.threadLocals = e.data;
					self.onmessage = undefined;
					e = undefined;

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

		for (let i = 0; i < threadSetupVars.seed.length; ++i) {
			seedBytes[i] = 0;
			threadSetupVars.seed[i] = 0;
		}

		const blobURL = URL.createObjectURL(
			new Blob([threadBody], {type: 'application/javascript'})
		);

		try {
			this.worker = new Worker(blobURL);
		}
		catch (err) {
			if (!env.isCordova) {
				throw err;
			}

			this.worker = new Worker(env.webSignPaths.worker);

			/* eslint-disable-next-line import/no-deprecated */
			this.worker.postMessage(threadBody);
		}

		this.worker.onmessage = e => {
			if (e.data === 'cyphThreadReady') {
				try {
					URL.revokeObjectURL(blobURL);
				}
				catch {}

				/* eslint-disable-next-line import/no-deprecated */
				this.worker.postMessage(locals);
			}
			else if (e.data === 'cyphThreadRunning') {
				/* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
				this.apiResolver.resolve(<any> Comlink.wrap(this.worker));
			}
			else if (e.data === 'cyphThreadClose') {
				this.stop();
			}
			else if (
				typeof e.data === 'object' &&
				'cyphThreadError' in e.data
			) {
				throw new Error(
					`Thread error (${name}): ${(
						e.data.cyphThreadError || ''
					).toString()}`
				);
			}
		};
	}
}
