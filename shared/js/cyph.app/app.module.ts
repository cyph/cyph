/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/global';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/node-polyfills';

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import 'hammerjs';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/init';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/test-environment-setup';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/translations';

import {HttpClient} from '@angular/common/http';
import {NgModule, NgZone} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {
	PreloadAllModules,
	Router,
	RouterModule,
	UrlSerializer
} from '@angular/router';
import {env} from '../cyph/env';
import {CyphAppModule} from '../cyph/modules/cyph-app.module';
import {CyphCommonModule} from '../cyph/modules/cyph-common.module';
import {CyphWebModule} from '../cyph/modules/cyph-web.module';
import * as proto from '../cyph/proto';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {ThreadedPotassiumService} from '../cyph/services/crypto/threaded-potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {FileService} from '../cyph/services/file.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {StringsService} from '../cyph/services/strings.service';
import {resolveStaticServices} from '../cyph/util/static-services';
import {appRoutes} from './app-routes';
import {AppService} from './app.service';
import {AppComponent} from './components/app';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';
import {LockdownComponent} from './components/lockdown';
import {SignupConfirmComponent} from './components/signup-confirm';
import {CustomUrlSerializer} from './custom-url-serializer';

/**
 * Angular module for Cyph web UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AppComponent,
		EphemeralChatRootComponent,
		LockdownComponent,
		SignupConfirmComponent
	],
	imports: [
		RouterModule.forRoot(appRoutes, {
			onSameUrlNavigation: 'reload',
			preloadingStrategy: PreloadAllModules,
			useHash: true
		}),
		CyphAppModule,
		CyphCommonModule,
		CyphWebModule
	],
	providers: [
		AppService,
		FaviconService,
		{
			provide: PotassiumService,
			useClass: ThreadedPotassiumService
		},
		{
			provide: UrlSerializer,
			useClass: CustomUrlSerializer
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
