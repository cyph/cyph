/* tslint:disable:no-import-side-effect no-reference */

/// <reference path="../typings/index.d.ts" />

import '../standalone/global';

import 'hammerjs';
import 'jquery';
import 'jquery.appear';
import 'rxjs/add/operator/toPromise';
import '../standalone/init';
import '../standalone/translations';
import './sham';

import {NgModule} from '@angular/core';
import {MdSidenavModule, MdSliderModule, MdToolbarModule} from '@angular/material';
import {RouterModule} from '@angular/router';
import {BetaRegisterComponent} from '../cyph/components/beta-register.component';
import {CheckoutComponent} from '../cyph/components/checkout.component';
import {DialogAlertComponent} from '../cyph/components/dialog-alert.component';
import {DialogConfirmComponent} from '../cyph/components/dialog-confirm.component';
import {DialogImageComponent} from '../cyph/components/dialog-image.component';
import {HelpComponent} from '../cyph/components/help.component';
import {CyphCommonModule} from '../cyph/modules/cyph-common.module';
import {CyphWebModule} from '../cyph/modules/cyph-web.module';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {HtmlSanitizerService} from '../cyph/services/html-sanitizer.service';
import {NotificationService} from '../cyph/services/notification.service';
import {appRoutes} from './app-routes';
import {AppComponent} from './app.component';
import {AppService} from './app.service';
import {DemoChatRootComponent} from './demo-chat-root.component';
import {DemoComponent} from './demo.component';
import {DemoService} from './demo.service';
import {MockDatabaseService} from './mock-database.service';
import {MockHtmlSanitizerService} from './mock-html-sanitizer.service';
import {MockPotassiumService} from './mock-potassium.service';
import {RouterComponent} from './router.component';
import {SilentNotificationService} from './silent-notification.service';


/**
 * Angular module for Cyph home page.
 */
@NgModule({
	bootstrap: [RouterComponent],
	declarations: [
		AppComponent,
		BetaRegisterComponent,
		DemoChatRootComponent,
		CheckoutComponent,
		DemoComponent,
		RouterComponent
	],
	entryComponents: [
		BetaRegisterComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogImageComponent,
		HelpComponent
	],
	imports: [
		RouterModule.forRoot(appRoutes),
		CyphCommonModule,
		CyphWebModule,
		MdSidenavModule,
		MdSliderModule,
		MdToolbarModule
	],
	providers: [
		AppService,
		DemoService,
		{
			provide: DatabaseService,
			useClass: MockDatabaseService
		},
		{
			provide: HtmlSanitizerService,
			useClass: MockHtmlSanitizerService
		},
		{
			provide: NotificationService,
			useClass: SilentNotificationService
		},
		{
			provide: PotassiumService,
			useClass: MockPotassiumService
		}
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor () {}
}
