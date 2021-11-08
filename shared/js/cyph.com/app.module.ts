/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/global';
/* eslint-disable-next-line import/no-unassigned-import */
import '../standalone/node-polyfills';

/* eslint-disable-next-line import/no-unassigned-import */
import 'hammerjs';

import {HttpClient} from '@angular/common/http';
import {DoBootstrap, Injector, NgModule, NgZone} from '@angular/core';
import {createCustomElement} from '@angular/elements';
import {DomSanitizer} from '@angular/platform-browser';
import {CheckoutComponent} from '../cyph/components/checkout';
import {CyphSharedModule} from '../cyph/modules/cyph-shared.module';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {ConfigService} from '../cyph/services/config.service';
import {EnvService} from '../cyph/services/env.service';
import {StringsService} from '../cyph/services/strings.service';
import {sendEmail} from '../cyph/util/email';
import {resolveStaticServices} from '../cyph/util/static-services';
import {resolvable} from '../cyph/util/wait/resolvable';

/**
 * Angular module for Cyph home page.
 */
@NgModule({
	imports: [CyphSharedModule],
	providers: [AnalyticsService]
})
export class AppModule implements DoBootstrap {
	/** @inheritDoc */
	public ngDoBootstrap () : void {
		customElements.define(
			'cyph-checkout',
			createCustomElement(CheckoutComponent, {injector: this.injector})
		);
	}

	constructor (
		domSanitizer: DomSanitizer,
		httpClient: HttpClient,
		ngZone: NgZone,
		analyticsService: AnalyticsService,
		configService: ConfigService,
		envService: EnvService,
		stringsService: StringsService,

		/** @ignore */
		private readonly injector: Injector
	) {
		analyticsService.setUID();

		(<any> self).cyphAnalytics = analyticsService;
		(<any> self).cyphConfig = configService;
		(<any> self).cyphEnv = envService;
		(<any> self).resolvable = resolvable;
		(<any> self).sendEmail = sendEmail;

		resolveStaticServices({
			domSanitizer,
			httpClient,
			ngZone,
			stringsService
		});
	}
}
