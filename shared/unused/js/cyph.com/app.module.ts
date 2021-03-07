/* tslint:disable:no-import-side-effect no-reference */

/// <reference path="../typings/index.d.ts" />

import '../standalone/global';
import '../standalone/node-polyfills';

import 'hammerjs';
import 'jquery-appear-original';
import '../standalone/translations';

import {HttpClient} from '@angular/common/http';
import {DoBootstrap, Injector, NgModule, NgZone} from '@angular/core';
import {createCustomElement} from '@angular/elements';
import {DomSanitizer} from '@angular/platform-browser';
import {CheckoutComponent} from '../cyph/components/checkout';
import {CyphCommonModule} from '../cyph/modules/cyph-common.module';
import {CyphWebModule} from '../cyph/modules/cyph-web.module';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {FileService} from '../cyph/services/file.service';
import {HtmlSanitizerService} from '../cyph/services/html-sanitizer.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {NotificationService} from '../cyph/services/notification.service';
import {StringsService} from '../cyph/services/strings.service';
import {email} from '../cyph/util/email';
import {resolveStaticServices} from '../cyph/util/static-services';
import {BetaRegisterComponent} from './components/beta-register';
import {ClaimUsernameComponent} from './components/claim-username';
import {DemoComponent} from './components/demo';
import {DemoChatRootComponent} from './components/demo-chat-root';
import {DemoService} from './demo.service';
import {MockDatabaseService} from './mock-database.service';
import {MockHtmlSanitizerService} from './mock-html-sanitizer.service';
import {MockPotassiumService} from './mock-potassium.service';
import {SilentNotificationService} from './silent-notification.service';

/**
 * Angular module for Cyph home page.
 */
@NgModule({
	declarations: [
		BetaRegisterComponent,
		CheckoutComponent,
		ClaimUsernameComponent,
		DemoChatRootComponent,
		DemoComponent
	],
	imports: [CyphCommonModule, CyphWebModule],
	providers: [
		DemoService,
		LocalStorageService,
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
export class AppModule implements DoBootstrap {
	/** @inheritDoc */
	public ngDoBootstrap () : void {
		customElements.define(
			'beta-register',
			createCustomElement(BetaRegisterComponent, {
				injector: this.injector
			})
		);

		customElements.define(
			'cyph-checkout',
			createCustomElement(CheckoutComponent, {injector: this.injector})
		);

		customElements.define(
			'cyph-claim-username',
			createCustomElement(ClaimUsernameComponent, {
				injector: this.injector
			})
		);

		customElements.define(
			'cyph-demo',
			createCustomElement(DemoComponent, {injector: this.injector})
		);
	}

	constructor (
		domSanitizer: DomSanitizer,
		httpClient: HttpClient,
		ngZone: NgZone,
		_ANALYTICS_SERVICE: AnalyticsService,
		dialogService: DialogService,
		fileService: FileService,
		stringsService: StringsService,

		/** @ignore */
		private readonly injector: Injector
	) {
		(<any> self).sendEmail = email;

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
