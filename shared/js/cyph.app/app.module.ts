/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/global';
/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/node-polyfills';

/* eslint-disable-next-line import/no-unassigned-import */
import 'hammerjs';
/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/init';
/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/test-environment-setup';
/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/translations';

import {HttpClient} from '@angular/common/http';
import {NgModule, NgZone} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Router} from '@angular/router';
import {env} from '../cyph/env';
import * as proto from '../cyph/proto';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {ThreadedPotassiumService} from '../cyph/services/crypto/threaded-potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {FileService} from '../cyph/services/file.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {StringsService} from '../cyph/services/strings.service';
import {resolveStaticServices} from '../cyph/util/static-services';
import {
	bootstrap,
	declarations,
	imports,
	providers
} from './app-module-options';
import {appRoutes} from './app-routes';
import {AppService} from './app.service';

/**
 * Angular module for Cyph web UI.
 */
@NgModule({
	bootstrap,
	declarations,
	imports,
	providers: [
		...providers,
		{
			provide: PotassiumService,
			useClass: ThreadedPotassiumService
		}
	]
})
export class AppModule {
	constructor (
		domSanitizer: DomSanitizer,
		httpClient: HttpClient,
		ngZone: NgZone,
		router: Router,
		appService: AppService,
		databaseService: DatabaseService,
		dialogService: DialogService,
		fileService: FileService,
		localStorageService: LocalStorageService,
		potassiumService: PotassiumService,
		stringsService: StringsService
	) {
		if (
			env.environment.customBuild?.config.lockedDown ||
			burnerRoot === ''
		) {
			router.resetConfig(appRoutes);
		}

		if (typeof testEnvironmentSetup === 'function') {
			testEnvironmentSetup(databaseService, localStorageService);
		}

		resolveStaticServices({
			dialogService,
			domSanitizer,
			fileService,
			httpClient,
			ngZone,
			stringsService
		});

		/* For debugging */

		if (!env.debug) {
			return;
		}

		(<any> self).appService = appService;
		(<any> self).potassiumService = potassiumService;
		(<any> self).proto = proto;
	}
}
