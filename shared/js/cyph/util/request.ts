import {
	HttpErrorResponse,
	HttpEventType,
	HttpHeaders,
	HttpRequest,
	HttpResponse
} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {MaybePromise} from '../maybe-promise-type';
import {parse, stringify, toQueryString} from './serialization';
import {staticHttpClient} from './static-services';
import {sleep} from './wait/sleep';

/** Performs HTTP request. */
const baseRequest = <R, T>(
	o: {
		contentType?: string;
		data?: any;
		debug?: {tries?: number};
		discardErrors?: boolean;
		headers?: Record<string, string | string[]>;
		method?: string;
		rawData?: Uint8Array;
		retries?: number;
		timeout?: number;
		url: string;
	},
	responseType: 'arraybuffer' | 'blob' | 'json' | 'text',
	getResponseData: (res: HttpResponse<T>) => MaybePromise<R>
) : {
	progress: Observable<number>;
	result: Promise<R>;
} => {
	const progress = new BehaviorSubject(0);

	return {
		progress,
		/* eslint-disable-next-line complexity */
		result: (async () => {
			const httpClient = await staticHttpClient;

			const headers = o.headers || {};
			const method = o.method || 'GET';
			const rawData = o.rawData;
			const retries = o.retries === undefined ? 0 : o.retries;
			let contentType = o.contentType || '';
			let data = o.data;
			let url = o.url;

			if (!contentType) {
				if (url.slice(-5) === '.json') {
					contentType = 'application/json';
				}
				else if (responseType === 'json' || responseType === 'text') {
					contentType = 'application/x-www-form-urlencoded';
				}
			}

			if (data && method === 'GET') {
				url +=
					'?' +
					(typeof data === 'object' ?
						toQueryString(data) :
						<string> data.toString());

				data = undefined;
			}
			else if (typeof data === 'object') {
				data =
					contentType === 'application/json' ?
						stringify(data) :
						toQueryString(data);
			}

			if (rawData) {
				data = rawData;
				contentType = 'application/octet-stream';
			}

			let response: R | undefined;
			let error: any;
			let statusOk = false;

			for (let i = 0; !statusOk && i <= retries; ++i) {
				if (o.debug) {
					o.debug.tries = (o.debug.tries || 0) + 1;
				}

				try {
					progress.next(0);

					const req = httpClient.request<T>(
						new HttpRequest(method, url, data, {
							headers: new HttpHeaders({
								...(contentType ?
									/* eslint-disable-next-line @typescript-eslint/naming-convention */
									{'Content-Type': contentType} :
									{}),
								...headers
							}),
							reportProgress: true,
							responseType
						})
					);

					const res = await Promise.race([
						new Promise<HttpResponse<T>>((resolve, reject) => {
							/* eslint-disable-next-line rxjs/no-ignored-subscription */
							req.subscribe({
								error: reject,
								next: e => {
									if (
										e.type ===
										HttpEventType.DownloadProgress
									) {
										progress.next(
											(e.loaded / (e.total || e.loaded)) *
												100
										);
									}
									else if (
										e.type === HttpEventType.Response
									) {
										resolve(e);
									}
								}
							});
						}),
						...(!o.timeout ?
							[] :
							[
								sleep(o.timeout).then(async () =>
									Promise.reject('Request timeout.')
								)
							])
					]);

					statusOk = res.ok;
					response = await getResponseData(res);
				}
				catch (err) {
					error = err;
					statusOk = false;
				}
			}

			if (!statusOk || response === undefined) {
				const err =
					(error instanceof HttpErrorResponse && error.error ?
						error.error instanceof ArrayBuffer ?
							new Error(
								potassiumUtil.toString(
									new Uint8Array(error.error)
								)
							) :
							new Error(error.error) :
						undefined) ||
					error ||
					response ||
					new Error('Request failed.');

				progress.error(err);
				throw err;
			}

			progress.next(100);
			progress.complete();
			return response;
		})()
	};
};

/** Performs HTTP request. */
export const request = async (o: {
	contentType?: string;
	data?: any;
	debug?: {tries?: number};
	headers?: Record<string, string | string[]>;
	method?: string;
	rawData?: Uint8Array;
	retries?: number;
	timeout?: number;
	url: string;
}) : Promise<string> => {
	return baseRequest<string, string>(o, 'text', res =>
		(res.body || '').trim()
	).result;
};

/** Performs HTTP request. */
export const requestByteStream = (o: {
	contentType?: string;
	data?: any;
	debug?: {tries?: number};
	headers?: Record<string, string | string[]>;
	method?: string;
	rawData?: Uint8Array;
	retries?: number;
	timeout?: number;
	url: string;
}) : {
	progress: Observable<number>;
	result: Promise<Uint8Array>;
} => {
	return baseRequest<Uint8Array, ArrayBuffer>(o, 'arraybuffer', res =>
		res.body ? new Uint8Array(res.body) : new Uint8Array(0)
	);
};

/** Performs HTTP request. */
export const requestBytes = async (o: {
	contentType?: string;
	data?: any;
	debug?: {tries?: number};
	headers?: Record<string, string | string[]>;
	method?: string;
	rawData?: Uint8Array;
	retries?: number;
	timeout?: number;
	url: string;
}) : Promise<Uint8Array> => {
	return requestByteStream(o).result;
};

/** Performs HTTP request. */
export const requestMaybeJSON = async (o: {
	contentType?: string;
	data?: any;
	debug?: {tries?: number};
	headers?: Record<string, string | string[]>;
	method?: string;
	rawData?: Uint8Array;
	retries?: number;
	timeout?: number;
	url: string;
}) : Promise<any> => {
	const response = await request(o);

	try {
		return parse(response);
	}
	catch {
		return response;
	}
};

/** Performs HTTP request. */
export const requestJSON = async (o: {
	contentType?: string;
	data?: any;
	debug?: {tries?: number};
	headers?: Record<string, string | string[]>;
	method?: string;
	rawData?: Uint8Array;
	retries?: number;
	timeout?: number;
	url: string;
}) : Promise<any> => {
	return baseRequest<any, any>(o, 'json', res => res.body).result;
};
