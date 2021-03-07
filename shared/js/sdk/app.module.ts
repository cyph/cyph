/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/global';

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/init';

import {HttpClient} from '@angular/common/http';
import {NgModule, NgZone} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ServerModule} from '@angular/platform-server';
import {CyphSDKModule} from '../cyph/modules/cyph-sdk.module';
import {DialogService} from '../cyph/services/dialog.service';
import {FileService} from '../cyph/services/file.service';
import {StringsService} from '../cyph/services/strings.service';
import {resolveStaticServices} from '../cyph/util/static-services';

/**
 * Angular module for Cyph SDK.
 */
@NgModule({
	imports: [CyphSDKModule, ServerModule]
})
export class AppModule {
	constructor (
		domSanitizer: DomSanitizer,
		httpClient: HttpClient,
		ngZone: NgZone,
		dialogService: DialogService,
		fileService: FileService,
		stringsService: StringsService
	) {
		resolveStaticServices({
			dialogService,
			domSanitizer,
			fileService,
			httpClient,
			ngZone,
			stringsService
		});
	}
}
