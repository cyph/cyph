/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="./js/typings/index.d.ts" />

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import 'nativescript-websockets';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import './js/standalone/test-environment-setup';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import './js/standalone/translations';

import {HttpClient} from '@angular/common/http';
import {NgModule, NgZone, NO_ERRORS_SCHEMA} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {Router} from '@angular/router';
import {NativeScriptAnimationsModule} from 'nativescript-angular/animations';
import {NativeScriptFormsModule} from 'nativescript-angular/forms';
import {NativeScriptHttpClientModule} from 'nativescript-angular/http-client';
import {ModalDialogService} from 'nativescript-angular/modal-dialog';
import {NativeScriptModule} from 'nativescript-angular/nativescript.module';
import {NativeScriptRouterModule} from 'nativescript-angular/router';
import {appRoutes} from './app-routes';
import {AppService} from './app.service';
import {AppComponent} from './components/app';
import {DialogMediaComponent} from './components/dialog-media';
import {CyphAppModule} from './js/cyph/modules/cyph-app.module';
import {CyphCommonModule} from './js/cyph/modules/cyph-common.module';
import {MainThreadPotassiumService} from './js/cyph/services/crypto/main-thread-potassium.service';
import {PotassiumService} from './js/cyph/services/crypto/potassium.service';
import {DialogService} from './js/cyph/services/dialog.service';
import {FileService} from './js/cyph/services/file.service';
import {LocalStorageService} from './js/cyph/services/local-storage.service';
import {StringsService} from './js/cyph/services/strings.service';
import {resolveStaticServices} from './js/cyph/util/static-services';
import {NativeDialogService} from './native-dialog.service';
import {NativeLocalStorageService} from './native-local-storage.service';
import {NativeTitleService} from './native-title.service';

/**
 * Angular module for Cyph native UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [AppComponent, DialogMediaComponent],
	imports: [
		NativeScriptRouterModule.forRoot([]),
		CyphAppModule,
		CyphCommonModule,
		NativeScriptAnimationsModule,
		NativeScriptHttpClientModule,
		NativeScriptFormsModule,
		NativeScriptModule,
		NativeScriptRouterModule
	],
	providers: [
		AppService,
		ModalDialogService,
		{
			provide: DialogService,
			useClass: NativeDialogService
		},
		{
			provide: LocalStorageService,
			useClass: NativeLocalStorageService
		},
		{
			provide: PotassiumService,
			useClass: MainThreadPotassiumService
		},
		{
			provide: Title,
			useClass: NativeTitleService
		}
	],
	schemas: [NO_ERRORS_SCHEMA]
})
export class AppModule {
	constructor (
		httpClient: HttpClient,
		ngZone: NgZone,
		router: Router,
		dialogService: DialogService,
		fileService: FileService,
		stringsService: StringsService
	) {
		router.resetConfig(appRoutes);

		resolveStaticServices({
			dialogService,
			fileService,
			httpClient,
			ngZone,
			stringsService
		});
	}
}
