import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatChipsModule} from '@angular/material/chips';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSliderModule} from '@angular/material/slider';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {TextMaskModule} from 'angular2-text-mask';
import lottiePlayer from 'lottie-web';
import {NgxCaptchaModule} from 'ngx-captcha';
import {ImageCropperModule} from 'ngx-image-cropper';
import {LottieModule} from 'ngx-lottie';
import {AccountContactsSearchComponent} from '../components/account-contacts-search';
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

/** @see LottiePlayerFactoryOrLoader */
export const lottiePlayerFactory = () => {
	return lottiePlayer;
};

/**
 * Common module shared by cyph.com and CyphWebModule.
 */
@NgModule({
	declarations: [
		AccountContactsSearchComponent,
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
		AccountContactsSearchComponent,
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
		LottieModule,
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
		TextMaskModule,
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
		LottieModule.forRoot({player: lottiePlayerFactory}),
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
		ReactiveFormsModule,
		TextMaskModule
	],
	providers: sharedModuleProviders
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
