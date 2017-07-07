/* tslint:disable:no-import-side-effect no-reference */

/// <reference path="../typings/index.d.ts" />

import '../standalone/global';

import 'hammerjs';
import 'rxjs/add/operator/toPromise';
import '../standalone/custombuild';
import '../standalone/init';
import '../standalone/translations';

import {NgModule} from '@angular/core';
import {Http} from '@angular/http';
import {RouterModule} from '@angular/router';
import {DialogAlertComponent} from '../cyph/components/dialog-alert.component';
import {DialogConfirmComponent} from '../cyph/components/dialog-confirm.component';
import {DialogImageComponent} from '../cyph/components/dialog-image.component';
import {HelpComponent} from '../cyph/components/help.component';
import {CyphAppModule} from '../cyph/modules/cyph-app.module';
import {CyphCommonModule} from '../cyph/modules/cyph-common.module';
import {CyphWebModule} from '../cyph/modules/cyph-web.module';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {ThreadedPotassiumService} from '../cyph/services/crypto/threaded-potassium.service';
import {DialogService} from '../cyph/services/dialog.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {Util} from '../cyph/util';
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
	entryComponents: [
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogImageComponent,
		HelpComponent
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
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor (dialogService: DialogService, http: Http) {
		Util.resolveDialogService(dialogService);
		Util.resolveHttp(http);
	}
}
