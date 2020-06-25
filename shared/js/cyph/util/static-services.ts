import {HttpClient} from '@angular/common/http';
import {NgZone} from '@angular/core';
import {DomSanitizer, SafeValue} from '@angular/platform-browser';
import {env} from '../env';
import {DialogService} from '../services/dialog.service';
import {FileService} from '../services/file.service';
import {StringsService} from '../services/strings.service';
import {resolvable} from './wait';

/** Resolvable dialogService. */
const resolvableDialogService = !env.isMainThread ?
	undefined :
	resolvable<DialogService>();

/** @ignore */
export const staticDialogService = resolvableDialogService ?
	resolvableDialogService :
	Promise.reject('Dialog service not found.');

/** Resolvable domSanitizer. */
const resolvableDomSanitizer = resolvable<DomSanitizer>();

if (!(env.isMainThread && env.isWeb)) {
	const notImplemented = () => {
		throw new Error('Not implemented.');
	};

	resolvableDomSanitizer.resolve({
		bypassSecurityTrustHtml: notImplemented,
		bypassSecurityTrustResourceUrl: notImplemented,
		bypassSecurityTrustScript: notImplemented,
		bypassSecurityTrustStyle: notImplemented,
		bypassSecurityTrustUrl: data => data,
		sanitize: (_: any, data: SafeValue) => <string> data
	});
}

/** @see DomSanitizer */
export const staticDomSanitizer = resolvableDomSanitizer;

/** Resolvable fileService. */
const resolvableFileService = !env.isMainThread ?
	undefined :
	resolvable<FileService>();

/** @ignore */
export const staticFileService = resolvableFileService ?
	resolvableFileService :
	Promise.reject('File service not found.');

/** Resolvable httpClient. */
const resolvableHttpClient = !env.isMainThread ?
	undefined :
	resolvable<HttpClient>();

/** @see HttpClient */
export const staticHttpClient = resolvableHttpClient ?
	resolvableHttpClient :
	Promise.reject('HTTP service not found.');

/** Resolvable ngZone. */
const resolvableNgZone = resolvable<NgZone>();

/** @see NgZone */
export const staticNgZone = resolvableNgZone;

/** Resolvable stringsService. */
const resolvableStringsService = !env.isMainThread ?
	undefined :
	resolvable<StringsService>();

/** @ignore */
export const staticStringsService = resolvableStringsService ?
	resolvableStringsService :
	Promise.reject('Strings service not found.');

/** Resolves static services. */
export const resolveStaticServices = ({
	dialogService,
	domSanitizer,
	fileService,
	httpClient,
	ngZone,
	stringsService
}: {
	dialogService?: DialogService;
	domSanitizer?: DomSanitizer;
	fileService?: FileService;
	httpClient?: HttpClient;
	ngZone: NgZone;
	stringsService?: StringsService;
}) => {
	if (dialogService && resolvableDialogService) {
		resolvableDialogService.resolve(dialogService);
	}

	if (resolvableDomSanitizer && domSanitizer) {
		resolvableDomSanitizer.resolve(domSanitizer);
	}

	if (fileService && resolvableFileService) {
		resolvableFileService.resolve(fileService);
	}

	if (resolvableHttpClient && httpClient) {
		resolvableHttpClient.resolve(httpClient);
	}

	resolvableNgZone.resolve(ngZone);

	if (resolvableStringsService && stringsService) {
		resolvableStringsService.resolve(stringsService);
	}
};
