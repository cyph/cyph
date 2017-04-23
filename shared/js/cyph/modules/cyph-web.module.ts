import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {
	MdButtonModule,
	MdButtonToggleModule,
	MdCardModule,
	MdDialogModule,
	MdIconModule,
	MdInputModule,
	MdListModule,
	MdMenuModule,
	MdProgressBarModule,
	MdProgressSpinnerModule,
	MdSelectModule,
	MdSlideToggleModule,
	MdSnackBarModule,
	MdTabsModule,
	MdTooltipModule
} from '@angular/material';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
	SmdFabSpeedDialActions,
	SmdFabSpeedDialComponent,
	SmdFabSpeedDialTrigger
} from '../components/fab-speed-dial.tmp';
import {NanoScrollerDirective} from '../directives/nano-scroller.directive';


/**
 * Common module with shared imports for web projects.
 */
@NgModule({
	declarations: [
		NanoScrollerDirective,
		SmdFabSpeedDialActions,
		SmdFabSpeedDialComponent,
		SmdFabSpeedDialTrigger
	],
	exports: [
		BrowserAnimationsModule,
		BrowserModule,
		FlexLayoutModule,
		FormsModule,
		MdButtonModule,
		MdButtonToggleModule,
		MdCardModule,
		MdDialogModule,
		MdIconModule,
		MdInputModule,
		MdListModule,
		MdMenuModule,
		MdProgressBarModule,
		MdProgressSpinnerModule,
		MdSelectModule,
		MdSlideToggleModule,
		MdSnackBarModule,
		MdTabsModule,
		MdTooltipModule,
		NanoScrollerDirective,
		SmdFabSpeedDialActions,
		SmdFabSpeedDialComponent,
		SmdFabSpeedDialTrigger
	],
	imports: [
		BrowserAnimationsModule,
		BrowserModule,
		FlexLayoutModule,
		FormsModule,
		MdButtonModule,
		MdCardModule,
		MdDialogModule,
		MdIconModule,
		MdInputModule,
		MdListModule,
		MdMenuModule,
		MdProgressBarModule,
		MdProgressSpinnerModule,
		MdSelectModule,
		MdSlideToggleModule,
		MdSnackBarModule,
		MdTabsModule,
		MdTooltipModule
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class CyphWebModule {
	constructor () {}
}
