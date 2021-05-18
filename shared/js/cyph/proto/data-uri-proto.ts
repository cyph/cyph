import {SecurityContext} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {MaybePromise} from '../maybe-promise-type';
import {staticDomSanitizer} from '../util/static-services';

/** Base64 data URI encoder/decoder. (Doesn't actually use Protocol Buffers.) */
export class DataURIProto {
	/** Converts possible-SafeUrl to string. */
	public static async safeUrlToString (
		data: SafeUrl | string,
		mediaType?: string
	) : Promise<string> {
		if (typeof data === 'string') {
			return data;
		}

		if (!data) {
			throw new Error('Undefined input.');
		}

		const sanitized = (await staticDomSanitizer).sanitize(
			SecurityContext.URL,
			data
		);

		if (typeof sanitized !== 'string') {
			throw new Error('Input failed DomSanitizer validation.');
		}

		return mediaType ?
			`data:${mediaType};base64,${sanitized.split(';base64,')[1]}` :
			sanitized;
	}

	/** @see IProto.create */
	public static create () : SafeUrl {
		return {};
	}

	/** @see IProto.decode */
	public static async decode (
		bytes: Uint8Array,
		mediaType: string = 'image/png'
	) : Promise<SafeUrl> {
		if (bytes.length < 1) {
			return {};
		}

		return (await staticDomSanitizer).bypassSecurityTrustUrl(
			`data:${mediaType};base64,` + potassiumUtil.toBase64(bytes)
		);
	}

	/** @see IProto.encode */
	public static async encode (data: SafeUrl | string) : Promise<Uint8Array> {
		try {
			data = await DataURIProto.safeUrlToString(data);
		}
		catch {}

		if (typeof data !== 'string') {
			return new Uint8Array(0);
		}

		return potassiumUtil.fromBase64(data.slice(data.indexOf(',')));
	}

	/** @see IProto.verify */
	public static async verify (
		data: SafeUrl | string
	) : Promise<string | undefined> {
		try {
			data = await DataURIProto.safeUrlToString(data);
		}
		catch {}

		if (
			typeof data === 'string' &&
			/^data:[^\/]+\/[^\/]+;base64,$/.test(
				data.slice(0, data.indexOf(',') + 1)
			)
		) {
			return;
		}

		return 'Not a data URI.';
	}

	/** @see DataURIProto.create */
	public async create () : Promise<SafeUrl> {
		return DataURIProto.create();
	}

	/** @see DataURIProto.decode */
	public async decode (bytes: Uint8Array) : Promise<SafeUrl> {
		return DataURIProto.decode(bytes, await this.mediaType);
	}

	/** @see DataURIProto.encode */
	public async encode (data: SafeUrl | string) : Promise<Uint8Array> {
		return DataURIProto.encode(data);
	}

	/** @see DataURIProto.verify */
	public async verify (data: SafeUrl | string) : Promise<string | undefined> {
		return DataURIProto.verify(data);
	}

	constructor (
		/** @ignore */
		private readonly mediaType: MaybePromise<string>
	) {}
}
