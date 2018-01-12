import {SecurityContext} from '@angular/core';
import {SafeStyle, SafeUrl} from '@angular/platform-browser';
import {MaybePromise} from '../maybe-promise-type';
import {staticDomSanitizer} from './static-services';


/** Converts a URL into a `url()` SafeStyle. */
export const urlToSafeStyle	=
	async (url: MaybePromise<string|SafeUrl>) : Promise<SafeStyle> => {
		const domSanitizer	= await staticDomSanitizer;

		const urlValue	= await url;

		/* Temporary workaround for TypeScript 2.5 bug */
		const urlString	= typeof (<any> urlValue) === 'string' ?
			urlValue :
			domSanitizer.sanitize(SecurityContext.URL, urlValue)
		;

		if (!urlString) {
			throw new Error('Unsafe URL.');
		}

		return domSanitizer.bypassSecurityTrustStyle(`url(${urlString})`);
	}
;
