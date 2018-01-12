import {HttpClient} from '@angular/common/http';
import {DomSanitizer, SafeValue} from '@angular/platform-browser';
import {env} from '../env';
import {DialogService} from '../services/dialog.service';


/** Sets dialogService. */
let resolveDialogService: (dialogService: DialogService) => void;

/** @ignore */
export const staticDialogService: Promise<DialogService>	=
	new Promise<DialogService>((resolve, reject) => {
		if (env.isMainThread) {
			resolveDialogService	= resolve;
			return;
		}

		reject('Dialog service not found.');
	})
;


/** Sets domSanitizer. */
let resolveDomSanitizer: (domSanitizer: DomSanitizer) => void;

/** @see DomSanitizer */
export const staticDomSanitizer: Promise<DomSanitizer>	=
	new Promise<DomSanitizer>(resolve => {
		if (env.isMainThread && env.isWeb) {
			resolveDomSanitizer	= resolve;
			return;
		}

		const notImplemented	= () => { throw new Error('Not implemented.'); };

		resolve({
			bypassSecurityTrustHtml: notImplemented,
			bypassSecurityTrustResourceUrl: notImplemented,
			bypassSecurityTrustScript: notImplemented,
			bypassSecurityTrustStyle: notImplemented,
			bypassSecurityTrustUrl: (data: string) => data,
			sanitize: (_: any, data: SafeValue) => <string> data
		});
	})
;


/** Sets httpClient. */
let resolveHttpClient: (httpClient: HttpClient) => void;

/** @see HttpClient */
export const staticHttpClient: Promise<HttpClient>	=
	new Promise<HttpClient>((resolve, reject) => {
		if (env.isMainThread) {
			resolveHttpClient	= resolve;
			return;
		}

		reject('HTTP service not found.');
	})
;


export const resolveStaticServices	= (
	dialogService: DialogService,
	domSanitizer: DomSanitizer,
	httpClient: HttpClient
) => {
	resolveDialogService(dialogService);
	resolveDomSanitizer(domSanitizer);
	resolveHttpClient(httpClient);
};
