/* tslint:disable:no-import-side-effect no-reference */

/// <reference path="../typings/index.d.ts" />

import '../standalone/global';

import 'hammerjs';
import '../standalone/custombuild';
import '../standalone/init';
import '../standalone/test-environment-setup';
import '../standalone/translations';

import {HttpClient} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {RouterModule} from '@angular/router';
import {CyphAppModule} from '../cyph/modules/cyph-app.module';
import {CyphCommonModule} from '../cyph/modules/cyph-common.module';
import {CyphWebModule} from '../cyph/modules/cyph-web.module';
import {DataURIProto} from '../cyph/proto';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {ThreadedPotassiumService} from '../cyph/services/crypto/threaded-potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {resolveHttpClient} from '../cyph/util/request';
import {resolveDialogService} from '../cyph/util/save-file';
import {appRoutes} from './app-routes';
import {AppComponent} from './app.component';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {LockdownComponent} from './lockdown.component';


/**
 * Angular module for Cyph web UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AppComponent,
		EphemeralChatRootComponent,
		LockdownComponent
	],
	imports: [
		RouterModule.forRoot(appRoutes, {useHash: true}),
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
		}
	]
})
export class AppModule {
	constructor (
		domSanitizer: DomSanitizer,
		httpClient: HttpClient,
		databaseService: DatabaseService,
		dialogService: DialogService,
		localStorageService: LocalStorageService,
	) {
		if (typeof testEnvironmentSetup === 'function') {
			testEnvironmentSetup(databaseService, localStorageService);
		}

		DataURIProto.resolveDomSanitizer(domSanitizer);
		resolveHttpClient(httpClient);
		resolveDialogService(dialogService);
	}
}
