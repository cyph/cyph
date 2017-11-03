import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {
	MatButtonModule,
	MatButtonToggleModule,
	MatCardModule,
	MatCheckboxModule,
	MatDatepickerModule,
	MatDialogModule,
	MatIconModule,
	MatInputModule,
	MatListModule,
	MatMenuModule,
	MatNativeDateModule,
	MatProgressBarModule,
	MatProgressSpinnerModule,
	MatRadioModule,
	MatSelectModule,
	MatSliderModule,
	MatSlideToggleModule,
	MatSnackBarModule,
	MatTabsModule,
	MatTooltipModule
} from '@angular/material';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {RouterModule} from '@angular/router';
import {
	SmdFabSpeedDialActions,
	SmdFabSpeedDialComponent,
	SmdFabSpeedDialTrigger
} from 'angular-speed-dial';
import {TextMaskModule} from 'angular2-text-mask';
import {DialogAlertComponent} from '../components/dialog-alert.component';
import {DialogConfirmComponent} from '../components/dialog-confirm.component';
import {DialogImageComponent} from '../components/dialog-image.component';
import {DropZoneDirective} from '../directives/drop-zone.directive';
import {NanoScrollerDirective} from '../directives/nano-scroller.directive';
import {DialogService} from '../services/dialog.service';
import {LocalStorageService} from '../services/local-storage.service';
import {MaterialDialogService} from '../services/material-dialog.service';
import {WebLocalStorageService} from '../services/web-local-storage.service';


/**
 * Common module with shared imports for web projects.
 */
@NgModule({
	declarations: [
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogImageComponent,
		DropZoneDirective,
		NanoScrollerDirective,
		SmdFabSpeedDialActions,
		SmdFabSpeedDialComponent,
		SmdFabSpeedDialTrigger
	],
	entryComponents: [
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogImageComponent
	],
	exports: [
		BrowserAnimationsModule,
		BrowserModule,
		DialogAlertComponent,
		DialogConfirmComponent,
		DialogImageComponent,
		DropZoneDirective,
		FlexLayoutModule,
		FormsModule,
		MatButtonModule,
		MatButtonToggleModule,
		MatCardModule,
		MatCheckboxModule,
		MatDatepickerModule,
		MatDialogModule,
		MatIconModule,
		MatInputModule,
		MatListModule,
		MatMenuModule,
		MatNativeDateModule,
		MatProgressBarModule,
		MatProgressSpinnerModule,
		MatRadioModule,
		MatSelectModule,
		MatSliderModule,
		MatSlideToggleModule,
		MatSnackBarModule,
		MatTabsModule,
		MatTooltipModule,
		NanoScrollerDirective,
		ReactiveFormsModule,
		RouterModule,
		SmdFabSpeedDialActions,
		SmdFabSpeedDialComponent,
		SmdFabSpeedDialTrigger,
		TextMaskModule
	],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		FlexLayoutModule,
		FormsModule,
		HttpClientModule,
		MatButtonModule,
		MatCardModule,
		MatCheckboxModule,
		MatDatepickerModule,
		MatDialogModule,
		MatIconModule,
		MatInputModule,
		MatListModule,
		MatMenuModule,
		MatNativeDateModule,
		MatProgressBarModule,
		MatProgressSpinnerModule,
		MatRadioModule,
		MatSelectModule,
		MatSliderModule,
		MatSlideToggleModule,
		MatSnackBarModule,
		MatTabsModule,
		MatTooltipModule,
		ReactiveFormsModule,
		RouterModule,
		TextMaskModule
	],
	providers: [
		{
			provide: DialogService,
			useClass: MaterialDialogService
		},
		{
			provide: LocalStorageService,
			useClass: WebLocalStorageService
		}
	]
})
export class CyphWebModule {
	constructor () {}
}
