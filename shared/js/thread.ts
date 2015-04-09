/// <reference path="globals.ts" />


class Thread {
	private static BlobBuilder: any	=
		window['BlobBuilder'] ||
		window['WebKitBlobBuilder'] ||
		window['MozBlobBuilder']
	;


	private worker: Worker;

	public constructor (f: Function, vars?: {[name: string] : any}, onMessage?: (ev: MessageEvent) => any) {
		let s	= f.toString();
		s		=
			(vars ? 'let vars = ' + JSON.stringify(vars) + ';\n' : '') +
			s.slice(s.indexOf('{') + 1, s.lastIndexOf('}'))
		;

		try {
			let blob, blobUrl;

			try {
				blob	= new Blob([s], {type: 'application/javascript'});
			}
			catch (e) {
				let blobBuilder	= new Thread.BlobBuilder();
				blobBuilder.append(s);

				blob	= blobBuilder.getBlob();
			}

			try {
				blobUrl		= URL.createObjectURL(blob);
				this.worker	= new Worker(blobUrl);
			}
			finally {
				try {
					URL.revokeObjectURL(blobUrl);
					this.worker.terminate();
				}
				catch (_) {}
			}
		}
		catch (_) {
			this.worker	= new Worker('/websign/js/workerHelper.js');
			this.worker.postMessage(s);
		}

		if (onMessage) {
			this.onMessage(onMessage);
		}
	}

	public isAlive () : boolean {
		return !!this.worker;
	}

	public onMessage (f: (ev: MessageEvent) => any) : void {
		if (this.worker) {
			this.worker.onmessage	= f;
		}
	}

	public postMessage (o : any) : void {
		if (this.worker) {
			this.worker.postMessage(o);
		}
	}

	public stop () : void {
		this.worker.terminate();
		this.worker	= null;
	}
}
