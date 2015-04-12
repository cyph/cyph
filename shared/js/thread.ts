/// <reference path="eventmanager.ts" />
/// <reference path="globals.ts" />


class Thread {
	private static BlobBuilder: any	=
		window['BlobBuilder'] ||
		window['WebKitBlobBuilder'] ||
		window['MozBlobBuilder']
	;

	private static stringifyFunction (f: Function) : string {
		let s	= f.toString();
		return s.slice(s.indexOf('{') + 1, s.lastIndexOf('}'));
	}

	private static threadEnvSetup (vars: any, importScripts: Function) {
		let window: any		= this;
		let document: any	= this;

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

		if (typeof atob == 'undefined' || typeof btoa == 'undefined') {
			importScripts('/lib/bower_components/base64/base64.min.js');
		}

		if (typeof crypto == 'undefined') {
			if (typeof msCrypto != 'undefined') {
				crypto	= msCrypto;
			}
			else {
				let isaac: any;

				importScripts('/cryptolib/bower_components/isaac.js/isaac.js');
				isaac.seed(vars.threadRandomSeed);

				crypto	= {
					getRandomValues: array => {
						let max	= Math.pow(2, (array['BYTES_PER_ELEMENT'] || 4) * 8) - 1;

						for (let i = 0 ; i < array['length'] ; ++i) {
							array[i]	= Math.floor(isaac.random() * max);
						}

						return array;
					},

					subtle: null
				};
			}
		}
	}

	private static threadPostSetup (onmessage: (e: MessageEvent) => any) {
		if (!onmessage) {
			onmessage	= Thread.onmessage;
		}

		if (Controller) {
			Controller.update	= () =>
				Thread.callMainThread('Controller.update')
			;
		}
	}

	public static threads: Thread[]	= [];

	public static onmessage: (e: MessageEvent) => any;

	public static callMainThread (method: string, args: any[] = []) : void {
		if (Env.isMainThread) {
			eval(method).apply(null, args);
		}
		else {
			EventManager.trigger(EventManager.mainThreadEvents, {method, args});
		}
	}


	private worker: Worker;

	public constructor (f: Function, vars: any = {}, onmessage?: (e: MessageEvent) => any) {
		vars.threadRandomSeed	= crypto.getRandomValues(new Uint8Array(50000));

		let s	=
			(vars ? 'var vars = ' + JSON.stringify(vars) + ';\n' : '') +
			Thread.stringifyFunction(Thread.threadEnvSetup) +
			Thread.stringifyFunction(f) +
			Thread.stringifyFunction(Thread.threadPostSetup)
		;

		try {
			let blob: Blob;
			let blobUrl: string;

			try {
				blob	= new Blob([s], {type: 'application/javascript'});
			}
			catch (_) {
				let blobBuilder	= new Thread.BlobBuilder();
				blobBuilder.append(s);

				blob	= blobBuilder.getBlob();
			}

			try {
				blobUrl		= URL.createObjectURL(blob);
				this.worker	= new Worker(blobUrl);
			}
			catch (e) {
				this.worker.terminate();
				throw e;
			}
			finally {
				try {
					URL.revokeObjectURL(blobUrl);
				}
				catch (_) {}
			}
		}
		catch (_) {
			this.worker	= new Worker('/websign/js/workerHelper.js');
			this.worker.postMessage(s);
		}


		this.worker.onmessage	= (e: MessageEvent) => {
			if (e.data && e.data.isThreadEvent) {
				EventManager.trigger(e.data.event, e.data.data);
			}
			else if (onmessage) {
				onmessage(e);
			}
		};

		Thread.threads.push(this);
	}

	public isAlive () : boolean {
		return !!this.worker;
	}

	public postMessage (o: any) : void {
		if (this.worker) {
			this.worker.postMessage(o);
		}
	}

	public stop () : void {
		this.worker.terminate();
		this.worker	= null;

		Thread.threads	= Thread.threads.filter(t => t != this);
	}
}
