import {NgModule, NO_ERRORS_SCHEMA} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ModalDialogService} from 'nativescript-angular/modal-dialog';
import {NativeScriptModule} from 'nativescript-angular/nativescript.module';
import {appRoutes} from './app-routes';
import {AppComponent} from './app.component';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {HelpComponent} from './js/cyph/components/help.component';
import {CyphAppModule} from './js/cyph/modules/cyph-app.module';
import {CyphCommonModule} from './js/cyph/modules/cyph-common.module';
import {MainThreadPotassiumService} from './js/cyph/services/crypto/main-thread-potassium.service';
import {PotassiumService} from './js/cyph/services/crypto/potassium.service';
import {DialogService} from './js/cyph/services/dialog.service';
import {LocalStorageService} from './js/cyph/services/local-storage.service';
import {NativeDialogImageComponent} from './native-dialog-image.component';
import {NativeDialogService} from './native-dialog.service';
import {NativeLocalStorageService} from './native-local-storage.service';


/**
 * Angular module for Cyph native UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AppComponent,
		NativeDialogImageComponent,
		EphemeralChatRootComponent
	],
	entryComponents: [HelpComponent],
	imports: [
		RouterModule.forRoot(appRoutes, {useHash: true}),
		CyphAppModule,
		CyphCommonModule,
		NativeScriptModule
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
		}
	],
	schemas: [NO_ERRORS_SCHEMA]
})
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor () {}
}
