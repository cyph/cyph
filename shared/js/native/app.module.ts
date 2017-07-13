/* tslint:disable:no-import-side-effect no-reference */


/// <reference path="./js/typings/index.d.ts" />

import 'nativescript-websockets';
import 'rxjs/add/operator/toPromise';

import {NgModule, NgModuleFactoryLoader, NO_ERRORS_SCHEMA} from '@angular/core';
import {Http} from '@angular/http';
import {Title} from '@angular/platform-browser';
import {NativeScriptAnimationsModule} from 'nativescript-angular/animations';
import {NativeScriptFormsModule} from 'nativescript-angular/forms';
import {NativeScriptHttpModule} from 'nativescript-angular/http';
import {ModalDialogService} from 'nativescript-angular/modal-dialog';
import {NativeScriptModule} from 'nativescript-angular/nativescript.module';
import {NativeScriptRouterModule, NSModuleFactoryLoader} from 'nativescript-angular/router';
import {appRoutes} from './app-routes';
import {AppComponent} from './app.component';
import {AppService} from './app.service';
import {DialogImageComponent} from './dialog-image.component';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {HelpComponent} from './js/cyph/components/help.component';
import {CyphAppModule} from './js/cyph/modules/cyph-app.module';
import {CyphCommonModule} from './js/cyph/modules/cyph-common.module';
import {MainThreadPotassiumService} from './js/cyph/services/crypto/main-thread-potassium.service';
import {PotassiumService} from './js/cyph/services/crypto/potassium.service';
import {DialogService} from './js/cyph/services/dialog.service';
import {LocalStorageService} from './js/cyph/services/local-storage.service';
import {Util} from './js/cyph/util';
import {NativeDialogService} from './native-dialog.service';
import {NativeLocalStorageService} from './native-local-storage.service';
import {NativeTitleService} from './native-title.service';


/**
 * Angular module for Cyph native UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AppComponent,
		DialogImageComponent,
		EphemeralChatRootComponent
	],
	entryComponents: [HelpComponent],
	imports: [
		NativeScriptRouterModule.forRoot(appRoutes),
		CyphAppModule,
		CyphCommonModule,
		NativeScriptAnimationsModule,
		NativeScriptHttpModule,
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
			provide: NgModuleFactoryLoader,
			useClass: NSModuleFactoryLoader
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
	constructor (http: Http, dialogService: DialogService) {
		Util.resolveHttp(http);
		Util.resolveDialogService(dialogService);
	}
}
