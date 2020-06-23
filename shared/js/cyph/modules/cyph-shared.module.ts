import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CheckoutComponent} from '../components/checkout';
import {DialogAlertComponent} from '../components/dialog-alert';
import {DialogConfirmComponent} from '../components/dialog-confirm';
import {DialogMediaComponent} from '../components/dialog-media';
import {MarkdownComponent} from '../components/markdown';
import {AnchorDirective} from '../directives/anchor.directive';
import {AutofocusDirective} from '../directives/autofocus.directive';
import {EnableLastPassDirective} from '../directives/enable-last-pass.directive';
import {NanoScrollerDirective} from '../directives/nano-scroller.directive';
import {RouterLinkDirective} from '../directives/router-link.directive';
import {TranslateDirective} from '../directives/translate.directive';
import {ArrayPipe} from '../pipes/array.pipe';
import {AwaitPipe} from '../pipes/await.pipe';
import {FilterPipe} from '../pipes/filter.pipe';
import {AffiliateService} from '../services/affiliate.service';
import {ConfigService} from '../services/config.service';
import {DialogService} from '../services/dialog.service';
import {DOMPurifyHtmlSanitizerService} from '../services/dompurify-html-sanitizer.service';
import {EnvService} from '../services/env.service';
import {HtmlSanitizerService} from '../services/html-sanitizer.service';
import {MaterialDialogService} from '../services/material-dialog.service';
import {SalesService} from '../services/sales.service';
import {SplitTestingService} from '../services/split-testing.service';
import {StringsService} from '../services/strings.service';

/**
 * Common module shared by cyph.com and CyphWebModule.
 */
@NgModule({
	declarations: [
		AnchorDirective,
		ArrayPipe,
		AutofocusDirective,
		AwaitPipe,
		CheckoutComponent,
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogMediaComponent,
		EnableLastPassDirective,
		FilterPipe,
		MarkdownComponent,
		NanoScrollerDirective,
		RouterLinkDirective,
		TranslateDirective
	],
	exports: [
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
		EnableLastPassDirective,
		FilterPipe,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		MarkdownComponent,
		MatButtonModule,
		MatCheckboxModule,
		MatDialogModule,
		MatInputModule,
		MatProgressSpinnerModule,
		MatSelectModule,
		NanoScrollerDirective,
		RouterLinkDirective,
		TranslateDirective
	],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		CommonModule,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		MatButtonModule,
		MatCheckboxModule,
		MatDialogModule,
		MatInputModule,
		MatProgressSpinnerModule,
		MatSelectModule
	],
	providers: [
		AffiliateService,
		ConfigService,
		EnvService,
		SalesService,
		SplitTestingService,
		StringsService,
		{
			provide: DialogService,
			useClass: MaterialDialogService
		},
		{
			provide: 'EnvService',
			useExisting: EnvService
		},
		{
			provide: HtmlSanitizerService,
			useClass: DOMPurifyHtmlSanitizerService
		}
	]
})
export class CyphSharedModule {
	constructor () {}
}
