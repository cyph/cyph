import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatLegacyAutocompleteModule as MatAutocompleteModule} from '@angular/material/legacy-autocomplete';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyChipsModule as MatChipsModule} from '@angular/material/legacy-chips';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacySlideToggleModule as MatSlideToggleModule} from '@angular/material/legacy-slide-toggle';
import {MatLegacySliderModule as MatSliderModule} from '@angular/material/legacy-slider';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FlexLayoutModule} from '@ngbracket/ngx-layout';
import {IMaskModule} from 'angular-imask';
import lottiePlayer from 'lottie-web';
import {NgxCaptchaModule} from 'ngx-captcha';
import {ImageCropperModule} from 'ngx-image-cropper';
import {LottieComponent, provideLottieOptions} from 'ngx-lottie';
import {AccountContactsSearchOptionalComponent} from '../components/account-contacts-search-optional';
import {CheckoutComponent} from '../components/checkout';
import {DialogAlertComponent} from '../components/dialog-alert';
import {DialogConfirmComponent} from '../components/dialog-confirm';
import {DialogMediaComponent} from '../components/dialog-media';
import {DynamicFormComponent} from '../components/dynamic-form';
import {MarkdownComponent} from '../components/markdown';
import {SearchBarComponent} from '../components/search-bar';
import {SpinnerComponent} from '../components/spinner';
import {AnchorDirective} from '../directives/anchor.directive';
import {AutofocusDirective} from '../directives/autofocus.directive';
import {DropZoneDirective} from '../directives/drop-zone.directive';
import {EnableLastPassDirective} from '../directives/enable-last-pass.directive';
import {NanoScrollerDirective} from '../directives/nano-scroller.directive';
import {RouterLinkDirective} from '../directives/router-link.directive';
import {TranslateDirective} from '../directives/translate.directive';
import {env} from '../env';
import {ArrayPipe} from '../pipes/array.pipe';
import {AwaitPipe} from '../pipes/await.pipe';
import {FilterPipe} from '../pipes/filter.pipe';
import {sharedModuleProviders} from '../providers/shared-module';
import {DialogService} from '../services/dialog.service';

/**
 * Common module shared by cyph.com and CyphWebModule.
 */
@NgModule({
	declarations: [
		AccountContactsSearchOptionalComponent,
		AnchorDirective,
		ArrayPipe,
		AutofocusDirective,
		AwaitPipe,
		CheckoutComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogMediaComponent,
		DropZoneDirective,
		DynamicFormComponent,
		EnableLastPassDirective,
		FilterPipe,
		MarkdownComponent,
		NanoScrollerDirective,
		RouterLinkDirective,
		SearchBarComponent,
		SpinnerComponent,
		TranslateDirective
	],
	exports: [
		AccountContactsSearchOptionalComponent,
		AnchorDirective,
		ArrayPipe,
		AutofocusDirective,
		AwaitPipe,
		BrowserAnimationsModule,
		BrowserModule,
		CheckoutComponent,
		CommonModule,
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogMediaComponent,
		DropZoneDirective,
		DynamicFormComponent,
		EnableLastPassDirective,
		FilterPipe,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		ImageCropperModule,
		IMaskModule,
		LottieComponent,
		MarkdownComponent,
		MatAutocompleteModule,
		MatButtonModule,
		MatCheckboxModule,
		MatChipsModule,
		MatDatepickerModule,
		MatDialogModule,
		MatIconModule,
		MatInputModule,
		MatListModule,
		MatProgressSpinnerModule,
		MatRadioModule,
		MatSelectModule,
		MatSliderModule,
		MatSlideToggleModule,
		MatTooltipModule,
		NanoScrollerDirective,
		NgxCaptchaModule,
		ReactiveFormsModule,
		RouterLinkDirective,
		SearchBarComponent,
		SpinnerComponent,
		TranslateDirective
	],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		CommonModule,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		ImageCropperModule,
		IMaskModule,
		LottieComponent,
		MatAutocompleteModule,
		MatButtonModule,
		MatCheckboxModule,
		MatChipsModule,
		MatDatepickerModule,
		MatDialogModule,
		MatIconModule,
		MatInputModule,
		MatListModule,
		MatProgressSpinnerModule,
		MatRadioModule,
		MatSelectModule,
		MatSliderModule,
		MatSlideToggleModule,
		MatTooltipModule,
		NgxCaptchaModule,
		ReactiveFormsModule
	],
	providers: [
		...sharedModuleProviders,
		provideLottieOptions({
			player: () => lottiePlayer
		})
	]
})
export class CyphSharedModule {
	constructor (dialogService: DialogService) {
		/* For debugging */

		if (!env.debug) {
			return;
		}

		(<any> self).dialogService = dialogService;
	}
}
