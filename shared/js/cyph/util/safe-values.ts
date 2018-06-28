import {SecurityContext} from '@angular/core';
import {SafeStyle, SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {MaybePromise} from '../maybe-promise-type';
import {staticDomSanitizer} from './static-services';


/** Converts a URL into a `url()` SafeStyle. */
/* tslint:disable-next-line:no-null-keyword */
export const urlToSafeStyle	=
	memoize(async (url: MaybePromise<string|SafeUrl|null|undefined>) : Promise<SafeStyle> => {
		const domSanitizer	= await staticDomSanitizer;

		const urlValue	= await url;
		const urlString	= typeof urlValue === 'string' || !urlValue ?
			urlValue :
			domSanitizer.sanitize(SecurityContext.URL, urlValue)
		;

		return domSanitizer.bypassSecurityTrustStyle(urlString ? `url(${urlString})` : '');
	})
;
