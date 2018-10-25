/* tslint:disable:no-import-side-effect no-reference */

/// <reference path="../typings/index.d.ts" />

import '../standalone/global';
import '../standalone/node-polyfills';

import 'hammerjs';

import {HttpClient} from '@angular/common/http';
import {DoBootstrap, Injector, NgModule, NgZone} from '@angular/core';
import {createCustomElement} from '@angular/elements';
import {FormsModule} from '@angular/forms';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {BrowserModule, DomSanitizer} from '@angular/platform-browser';
import {CheckoutComponent} from '../cyph/components/checkout';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {MaterialDialogService} from '../cyph/services/material-dialog.service';
import {StringsService} from '../cyph/services/strings.service';
import {email} from '../cyph/util/email';
import {resolveStaticServices} from '../cyph/util/static-services';


/**
 * Angular module for Cyph home page.
 */
@NgModule({
	declarations: [
		CheckoutComponent
	],
	entryComponents: [
		CheckoutComponent
	],
	imports: [
		BrowserModule,
		FormsModule,
		MatBottomSheetModule,
		MatButtonModule,
		MatDialogModule,
		MatInputModule,
		MatProgressSpinnerModule,
		MatSelectModule,
		MatSnackBarModule
	],
	providers: [
		EnvService,
		StringsService,
		{
			provide: DialogService,
			useClass: MaterialDialogService
		}
	]
})
export class AppModule implements DoBootstrap {
	/** @inheritdoc */
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
		_ANALYTICS_SERVICE: AnalyticsService,
		dialogService: DialogService,

		/** @ignore */
		private readonly injector: Injector
	) {
		(<any> self).sendEmail	= email;

		resolveStaticServices({
			dialogService,
			domSanitizer,
			httpClient,
			ngZone
		});
	}
}
