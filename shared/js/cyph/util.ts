import {saveAs} from 'file-saver';
import {config} from './config';
import {Email} from './email';
import {env} from './env';
import {eventManager} from './event-manager';


/**
 * Miscellaneous helper functions used throughout the codes.
 */
export class Util {
	/** @ignore */
	private static readonly openUrlThreadEvent: string	= 'openUrlThreadEvent';

	/** @ignore */
	private static readonly saveFileThreadEvent: string	= 'saveFileThreadEvent';


	/** @ignore */
	private readonly timestampData	= {last: 0, offset: 0, subtime: 0};

	/** Performs HTTP request. */
	private async baseRequest<T> (
		o: {
			contentType?: string;
			data?: any;
			discardErrors?: boolean;
			method?: string;
			retries?: number;
			url: string;
		},
		responseType: string,
		getResponseData: (res: Response) => Promise<T>
	) : Promise<T> {
		const method: string			= o.method || 'GET';
		const retries: number			= o.retries === undefined ? 0 : o.retries;
		let contentType: string			= o.contentType || '';
		let data: any					= o.data;
		let url: string					= o.url;

		if (url.slice(-5) === '.json') {
			contentType	= 'application/json';
		}
		else if (responseType === 'text') {
			contentType	= 'application/x-www-form-urlencoded';
		}

		if (data && method === 'GET') {
			url		+= '?' + (
				typeof data === 'object' ?
					this.toQueryString(data) :
					(<string> data.toString())
			);

			data	= undefined;
		}
		else if (typeof data === 'object') {
			data	= contentType === 'application/json' ?
				JSON.stringify(data) :
				this.toQueryString(data)
			;
		}

		let response: T|undefined;
		let error: Error|undefined;
		let statusOk	= false;

		for (let i = 0 ; !statusOk && i <= retries ; ++i) {
			try {
				const res	= await fetch(url, {
					method,
					body: data,
					headers: !contentType ? {} : {
						'Content-Type': contentType
					}
				});

				statusOk	= res.ok;
				response	= await getResponseData(res);
			}
			catch (err) {
				error		= err;
				statusOk	= false;
			}
		}

		if (!statusOk || !response) {
			throw error || response || new Error('Request failed.');
		}

		return response;
	}

	/** Sends an email to the Cyph team. "@cyph.com" may be omitted from email.to. */
	public email (email: Email) : void {
		this.request({
			data: {
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					from_email: (email.fromEmail || 'test@mandrillapp.com').
						replace('@cyph.com', '@mandrillapp.com')
					,
					from_name: email.fromName || 'Mandrill',
					subject: email.subject || 'New Cyph Email',
					text: (
						`${email.message}\n\n\n---\n\n${env.userAgent}\n\n` +
						`${env.language}\n\n${locationData.href}`
					).replace(/\/#.*/g, ''),
					to: [{
						email: (email.to || 'hello').replace('@cyph.com', '') + '@cyph.com',
						type: 'to'
					}]
				}
			},
			method: 'POST',
			url: 'https://mandrillapp.com/api/1.0/messages/send.json'
		}).catch(
			() => {}
		);

		email.sent	= true;
	}

	/**
	 * Randomly generates a GUID of specifed length using Config.guidAddressSpace.
	 * If no valid length is specified, Config.guidAddressSpace is ignored and the
	 * GUID will instead append a random 32-bit number to the current datetime.
	 */
	public generateGuid (length: number = 0) : string {
		if (length > 0) {
			let guid	= '';

			for (let i = 0 ; i < length ; ++i) {
				guid += config.guidAddressSpace[this.random(config.guidAddressSpace.length)];
			}

			return guid;
		}

		return `${
			this.timestamp().toString()
		}-${
			new Uint32Array(crypto.getRandomValues(new Uint32Array(1)).buffer)[0].toString()
		}`;
	}

	/** Gets a value from a map and sets a default value if none had previously been set. */
	public getOrSetDefault<K, V> (map: Map<K, V>, key: K, defaultValue: () => V) : V {
		if (!map.has(key)) {
			map.set(key, defaultValue());
		}

		const value	= map.get(key);

		if (value === undefined) {
			throw new Error("Util.getOrSetDefault doesn't support nullable types.");
		}

		return value;
	}

	/** Returns a human-readable representation of the time (e.g. "3:37pm"). */
	public getTimeString (timestamp: number) : string {
		const date: Date		= new Date(timestamp);
		const minute: string	= ('0' + date.getMinutes().toString()).slice(-2);
		let hour: number		= date.getHours();
		let ampm				= 'am';

		if (hour >= 12) {
			hour	-= 12;
			ampm	= 'pm';
		}
		if (hour === 0) {
			hour	= 12;
		}

		return `${hour.toString()}:${minute}${ampm}`;
	}

	/** Executes a Promise within a mutual-exclusion lock. */
	public async lock<T> (lock: any, f: () => Promise<T>) : Promise<T> {
		try {
			while (lock.isOwned) {
				await this.sleep();
			}

			lock.isOwned	= true;

			return (await f());
		}
		finally {
			lock.isOwned	= false;
		}
	}

	/**
	 * Executes a Promise within a mutual-exclusion lock, but
	 * will give up after first failed attempt to obtain lock.
	 */
	public async lockTryOnce<T> (lock: any, f: () => Promise<T>) : Promise<T|void> {
		if (!lock.isOwned) {
			return this.lock(lock, f);
		}
	}

	/** Opens the specified URL. */
	public async openUrl (url: string) : Promise<void> {
		if (!env.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (!env.isMainThread) {
			eventManager.trigger(Util.openUrlThreadEvent, url);
			return;
		}

		const a: HTMLAnchorElement	= document.createElement('a');

		a.href			= url;
		a.target		= '_blank';
		a.style.display	= 'none';

		document.body.appendChild(a);
		a.click();

		await this.sleep(120000);

		document.body.removeChild(a);

		try {
			URL.revokeObjectURL(a.href);
		}
		catch (_) {}
	}

	/**
	 * Cryptographically secure replacement for Math.random.
	 * @param max Upper bound.
	 * @param min Lower bound (0 by default).
	 * @returns If max is specified, returns integer in range [min, max);
	 * otherwise, returns float in range [0, 1) (like Math.random).
	 */
	public random (max?: number, min: number = 0) : number {
		const randomData: Uint16Array	= new Uint16Array(3);

		crypto.getRandomValues(randomData);

		let randomUint	= 0;
		for (let i = 0 ; i < randomData.length ; ++i) {
			randomUint		+= randomData[i] * Math.pow(2, i * 16);
			randomData[i]	= 0;
		}

		if (max === config.maxSafeUint) {
			return randomUint;
		}

		const randomFloat: number	= randomUint / config.maxSafeUint;

		if (max === undefined) {
			return randomFloat;
		}
		else if (isNaN(max) || max <= 0) {
			throw new Error('Upper bound must be a positive non-zero number.');
		}
		else if (isNaN(min) || min < 0) {
			throw new Error('Lower bound must be a positive number or zero.');
		}
		else if (min >= max) {
			throw new Error('Upper bound must be greater than lower bound.');
		}
		else {
			return Math.floor((randomFloat * (max - min)) + min);
		}
	}

	/**
	 * Converts b into a human-readable representation.
	 * @param b Number of bytes.
	 * @example 32483478 -> "30.97 MB".
	 */
	public readableByteLength (b: number) : string {
		const gb: number	= b / 1.074e+9;
		const mb: number	= b / 1.049e+6;
		const kb: number	= b / 1024;

		const o	=
			gb >= 1 ?
				{n: gb, s: 'G'} :
				mb >= 1 ?
					{n: mb, s: 'M'} :
					kb >= 1 ?
						{n: kb, s: 'K'} :
						{n: b, s: ''}
		;

		return o.n.toFixed(2) + ' ' + o.s + 'B';
	}

	/** Performs HTTP request. */
	public async request (o: {
		contentType?: string;
		data?: any;
		method?: string;
		retries?: number;
		url: string;
	}) : Promise<string> {
		return this.baseRequest(o, 'text', async res => (await res.text()).trim());
	}

	/** Performs HTTP request. */
	public async requestBytes (o: {
		contentType?: string;
		data?: any;
		method?: string;
		retries?: number;
		url: string;
	}) : Promise<Uint8Array> {
		return this.baseRequest(o, 'arraybuffer', async res =>
			new Uint8Array(await res.arrayBuffer())
		);
	}

	/** Runs f until it returns with no errors. */
	public async retryUntilSuccessful<T> (
		f: () => (T|Promise<T>),
		maxAttempts: number = 10
	) : Promise<T> {
		for (let i = 0 ; true ; ++i) {
			try {
				return await f();
			}
			catch (err) {
				if (i > maxAttempts) {
					throw err;
				}
				else {
					await this.sleep();
				}
			}
		}
	}

	/** Opens the specified URL. */
	public async saveFile (content: Uint8Array, fileName: string) : Promise<void> {
		if (!env.isMainThread) {
			eventManager.trigger(Util.saveFileThreadEvent, {content, fileName});
			return;
		}

		const onbeforeunload	= self.onbeforeunload;
		self.onbeforeunload		= () => {};

		saveAs(
			new Blob([content], {type: 'application/octet-stream'}),
			fileName,
			false
		);

		await this.sleep();
		self.onbeforeunload		= onbeforeunload;
	}

	/** Sleep for the specifed amount of time. */
	public async sleep (ms: number = 250) : Promise<void> {
		/* tslint:disable-next-line:ban */
		return new Promise<void>(resolve => { setTimeout(() => { resolve(); }, ms); });
	}

	/**
	 * Returns current timestamp, with logic to correct for incorrect
	 * local clocks and ensure each output is unique.
	 */
	public timestamp () : number {
		let timestamp: number	= Date.now() + this.timestampData.offset;

		if (timestamp === this.timestampData.last) {
			this.timestampData.subtime += 0.01;
			timestamp += this.timestampData.subtime;
		}
		else {
			this.timestampData.last		= timestamp;
			this.timestampData.subtime	= 0;
		}

		return timestamp;
	}

	/**
	 * Serialises o to a query string (cf. jQuery.param).
	 * @param o
	 * @param parent Ignore this (internal use).
	 */
	public toQueryString (o: any, parent?: string) : string {
		return Object.keys(o).
			map((k: string) => {
				const key: string	= parent ? (parent + '[' + k + ']') : k;

				return typeof o[k] === 'object' ?
					this.toQueryString(o[k], key) :
					`${encodeURIComponent(key)}=${encodeURIComponent(o[k])}`
				;
			}).
			join('&').
			replace(/%20/g, '+')
		;
	}

	/**
	 * Attempts to translate text into the user's language.
	 * @param text
	 * @param defaultValue Falls back to this if no translation exists.
	 */
	public translate (text: string, defaultValue: string = text) : string {
		return (translations[env.language] || {})[text] || defaultValue;
	}

	/** Simulates a click on elem. */
	public triggerClick (elem: HTMLElement) : void {
		if (!env.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const e: Event	= document.createEvent('MouseEvents');
		e.initEvent('click', true, false);
		elem.dispatchEvent(e);
	}

	/** Waits for iterable value to exist and have at least minLength elements. */
	public async waitForIterable<T> (
		f: () => T&{length: number}|undefined,
		minLength: number = 1
	) : Promise<T> {
		return this.waitForValue<T&{length: number}>(f, value => value.length >= minLength);
	}

	/** Waits until value exists before resolving it in promise. */
	public async waitForValue<T> (
		f: () => T|undefined,
		condition?: (value: T) => boolean
	) : Promise<T> {
		let value: T|undefined;

		while (value === undefined || (condition && !condition(value))) {
			value	= f();
			await this.sleep();
		}

		return value;
	}

	/** Waits until function returns true. */
	public async waitUntilTrue (f: () => boolean) : Promise<void> {
		await this.waitForValue(() => f() || undefined);
	}

	constructor () { (async () => {
		try {
			const serverTimestamp: number	= parseFloat(
				await this.request({url: env.baseUrl + 'timestamp'})
			);

			this.timestampData.offset	= serverTimestamp - Date.now();
		}
		catch (_) {}

		if (!env.isMainThread) {
			return;
		}

		while (!eventManager) {
			await this.sleep();
		}

		eventManager.on(Util.openUrlThreadEvent, (url: string) => { this.openUrl(url); });

		eventManager.on(Util.saveFileThreadEvent, (o: {content: Uint8Array; fileName: string}) => {
			this.saveFile(o.content, o.fileName);
		});
	})(); }
}

/** @see Util */
export const util	= new Util();
