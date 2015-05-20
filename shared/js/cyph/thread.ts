module Cyph {
	/**
	 * Creates and controls a thread.
	 */
	export class Thread {
		private static BlobBuilder: any	= Util.getValue(self, [
			'BlobBuilder',
			'WebKitBlobBuilder',
			'MozBlobBuilder'
		]);

		private static stringifyFunction (f: Function) : string {
			const s: string	= f.toString();
			return s.slice(s.indexOf('{'));
		}

		private static threadEnvSetup (vars: any, importScripts: Function) : void {
			/* Inherit these from main thread */

			location	= vars.location;
			navigator	= vars.navigator;


			/* Wrapper to make importScripts work in local dev environments
				(not used in prod because of WebSign packing) */

			const oldImportScripts	= importScripts;
			importScripts			= (script: string) => {
				oldImportScripts(
					`${location.protocol}//${location.host}` +
					script
				);
			};


			/* Normalisation to increase compatibility with Web libraries */

			importScripts('/js/global/base.js');


			/* Allow destroying the Thread object from within the thread */

			self.close	= () => self.postMessage('close', undefined);


			/* Polyfills */

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
				markTimeline: () => {},
				msIsIndependentlyComposed: () => false,
				profile: () => {},
				profiles: () => {},
				profileEnd: () => {},
				select: () => {},
				show: () => {},
				table: () => {},
				time: () => {},
				timeEnd: () => {},
				timeline: () => {},
				timelineEnd: () => {},
				timeStamp: () => {},
				trace: () => {},
				warn: () => {}
			};

			if (typeof atob === 'undefined' || typeof btoa === 'undefined') {
				importScripts('/lib/bower_components/base64/base64.min.js');
			}

			if (typeof crypto === 'undefined' && 'msCrypto' in self) {
				crypto	= self['msCrypto'];
			}
			try {
				crypto.getRandomValues(new Uint8Array(1));
			}
			catch (_) {
				let isaac: any;
				importScripts('/cryptolib/bower_components/isaac.js/isaac.js');
				isaac	= isaac || self['isaac'];

				isaac.seed(vars.threadRandomSeed);

				crypto	= {
					getRandomValues: array => {
						const bytes: number	=
							'BYTES_PER_ELEMENT' in array ?
								array['BYTES_PER_ELEMENT'] :
								4
						;

						const max: number	= Math.pow(2, bytes * 8) - 1;

						for (let i = 0 ; i < array['length'] ; ++i) {
							array[i]	= Math.floor(isaac.random() * max);
						}

						return array;
					},

					subtle: null
				};
			}
		}

		private static threadPostSetup () : void {
			if (!self.onmessage) {
				self.onmessage	= onthreadmessage;
			}
		}

		/** List of all active threads. */
		public static threads: Thread[]	= [];

		/**
		 * Sends command to the main thread.
		 * @param method Fully qualified method name (e.g. "Cyph.Thread.callMainThread").
		 * @param args
		 */
		public static callMainThread (method: string, args: any[] = []) : void {
			if (Env.isMainThread) {
				const methodSplit: string[]	= method.split('.');
				const methodName: string	= methodSplit.slice(-1)[0];

				/* Validate command against namespace whitelist, then execute */
				if (['Cyph', 'ui'].indexOf(methodSplit[0]) > -1) {
					const methodObject: any	= methodSplit.
						slice(0, -1).
						reduce((o: any, k: string) : any => o[k], self)
					;

					methodObject[methodName].apply(methodObject, args);
				}
				else {
					throw new Error(
						method +
						' not in whitelist. (args: ' +
						JSON.stringify(args) +
						')'
					);
				}
			}
			else {
				EventManager.trigger(EventManager.mainThreadEvents, {method, args});
			}
		}


		private worker: Worker;

		/**
		 * Indicates whether this thread is active.
		 */
		public isAlive () : boolean {
			return !!this.worker;
		}

		/**
		 * Sends a message to this thread.
		 */
		public postMessage (o: any) : void {
			if (this.worker) {
				this.worker.postMessage(o);
			}
		}

		/**
		 * This kills the thread.
		 */
		public stop () : void {
			if (this.worker) {
				this.worker.terminate();
			}

			this.worker	= null;

			Thread.threads	= Thread.threads.filter(t => t !== this);
		}

		/**
		 * @param f Function to run in the new thread.
		 * @param vars Local data to pass in to the new thread.
		 * @param onmessage Handler for messages from the thread.
		 */
		public constructor (
			f: Function,
			vars: any = {},
			onmessage: (e: MessageEvent) => any = e => {}
		) {
			vars.location	= {
				hash: location.hash,
				host: location.host,
				hostname: location.hostname,
				href: location.href,
				pathname: location.pathname,
				port: location.port,
				protocol: location.protocol,
				search: location.search
			};

			vars.navigator	= {language: Env.fullLanguage, userAgent: Env.userAgent};

			vars.threadRandomSeed	= crypto.getRandomValues(new Uint8Array(50000));

			const threadBody: string	=
				'var vars = ' + JSON.stringify(vars) + ';\n' +
				Thread.stringifyFunction(Thread.threadEnvSetup) +
				Thread.stringifyFunction(f) +
				Thread.stringifyFunction(Thread.threadPostSetup)
			;

			try {
				let blob: Blob;
				let blobUrl: string;

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
				finally {
					setTimeout(() => {
						try {
							URL.revokeObjectURL(blobUrl);
						}
						catch (_) {}
					}, 60000);
				}
			}
			catch (_) {
				this.worker	= new Worker(Config.webSignConfig.workerHelper);
				this.worker.postMessage(threadBody);
			}


			this.worker.onmessage	= (e: MessageEvent) => {
				if (e.data === 'close') {
					this.stop();
				}
				else if (Util.getValue(e.data, 'isThreadEvent')) {
					EventManager.trigger(e.data.event, e.data.data);
				}
				else {
					onmessage(e);
				}
			};

			Thread.threads.push(this);
		}
	}
}
