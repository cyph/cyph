/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import './polyfills';

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/global';

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../environments';

import {HttpClient} from '@angular/common/http';
import {NgModule, NgZone} from '@angular/core';
import {SERVER_TOKEN} from '@angular/flex-layout';
import {DomSanitizer} from '@angular/platform-browser';
import {ServerModule} from '@angular/platform-server';
import {MainThreadPotassiumService} from '../cyph/services/crypto/main-thread-potassium.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {DialogService} from '../cyph/services/dialog.service';
import {FileService} from '../cyph/services/file.service';
import {StringsService} from '../cyph/services/strings.service';
import {resolveStaticServices} from '../cyph/util/static-services';
import {
	bootstrap,
	declarations,
	imports,
	providers
} from '../cyph.app/app-module-options';

/**
 * Angular module for Cyph SDK.
 */
@NgModule({
	bootstrap,
	declarations,
	imports: [...imports, ServerModule],
	providers: [
		...providers,
		{provide: SERVER_TOKEN, useValue: true},
		{
			provide: PotassiumService,
			useClass: MainThreadPotassiumService
		}
	]
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
