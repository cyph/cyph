import {HttpClient} from '@angular/common/http';
import {NgZone} from '@angular/core';
import {DomSanitizer, SafeValue} from '@angular/platform-browser';
import {env} from '../env';
import {DialogService} from '../services/dialog.service';
import {resolvable} from './wait';


/** Resolvable dialogService. */
const resolvableDialogService	= !env.isMainThread ? undefined : resolvable<DialogService>();

/** @ignore */
export const staticDialogService: Promise<DialogService>	= resolvableDialogService ?
	resolvableDialogService.promise :
	Promise.reject('Dialog service not found.')
;


/** Resolvable domSanitizer. */
const resolvableDomSanitizer	= resolvable<DomSanitizer>();

if (!(env.isMainThread && env.isWeb)) {
	const notImplemented	= () => { throw new Error('Not implemented.'); };

	resolvableDomSanitizer.resolve({
		bypassSecurityTrustHtml: notImplemented,
		bypassSecurityTrustResourceUrl: notImplemented,
		bypassSecurityTrustScript: notImplemented,
		bypassSecurityTrustStyle: notImplemented,
		bypassSecurityTrustUrl: (data: string) => data,
		sanitize: (_: any, data: SafeValue) => <string> data
	});
}

/** @see DomSanitizer */
export const staticDomSanitizer: Promise<DomSanitizer>	= resolvableDomSanitizer.promise;


/** Resolvable httpClient. */
const resolvableHttpClient	= !env.isMainThread ? undefined : resolvable<HttpClient>();

/** @see HttpClient */
export const staticHttpClient: Promise<HttpClient>	= resolvableHttpClient ?
	resolvableHttpClient.promise :
	Promise.reject('HTTP service not found.')
;


/** Resolvable ngZone. */
const resolvableNgZone	= resolvable<NgZone>();

/** @see NgZone */
export const staticNgZone: Promise<NgZone>	= resolvableNgZone.promise;


export const resolveStaticServices	= ({dialogService, domSanitizer, httpClient, ngZone}: {
	dialogService?: DialogService;
	domSanitizer?: DomSanitizer;
	httpClient?: HttpClient;
	ngZone: NgZone;
}) => {
	if (dialogService && resolvableDialogService) {
		resolvableDialogService.resolve(dialogService);
	}

	if (resolvableDomSanitizer && domSanitizer) {
		resolvableDomSanitizer.resolve(domSanitizer);
	}

	if (resolvableHttpClient && httpClient) {
		resolvableHttpClient.resolve(httpClient);
	}

	resolvableNgZone.resolve(ngZone);
};
