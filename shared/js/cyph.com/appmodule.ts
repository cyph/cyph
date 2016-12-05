import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
import {
	Beta,
	ChatCyphertext,
	ChatMain,
	ChatMessageBox,
	Checkout,
	Contact,
	FileInput,
	Help,
	LinkConnection,
	Markdown,
	Register,
	SignupForm,
	StaticCyphNotFound,
	StaticFooter
} from '../cyph/ui/components';
import {
	MdButton,
	MdCard,
	MdCardContent,
	MdCardHeader,
	MdCardHeaderText,
	MdCardTitle,
	MdCardTitleText,
	MdContent,
	MdFabActions,
	MdFabSpeedDial,
	MdFabTrigger,
	MdIcon,
	MdInputContainer,
	MdList,
	MdListItem,
	MdMenu,
	MdOption,
	MdProgressCircular,
	MdProgressLinear,
	MdSelect,
	MdSidenav,
	MdSlider,
	MdSubheader,
	MdSwitch,
	MdTab,
	MdTabs,
	MdToolbar,
	MdTooltip
} from '../cyph/ui/components/material';
import {Translate} from '../cyph/ui/directives';
import {AppComponent} from './appcomponent';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	declarations: [
		AppComponent,
		Beta,
		ChatCyphertext,
		ChatMain,
		ChatMessageBox,
		Checkout,
		Contact,
		FileInput,
		Help,
		LinkConnection,
		Markdown,
		Register,
		SignupForm,
		StaticCyphNotFound,
		StaticFooter,
		Translate,
		MdButton,
		MdCard,
		MdCardContent,
		MdCardHeader,
		MdCardHeaderText,
		MdCardTitle,
		MdCardTitleText,
		MdContent,
		MdFabActions,
		MdFabSpeedDial,
		MdFabTrigger,
		MdIcon,
		MdInputContainer,
		MdList,
		MdListItem,
		MdMenu,
		MdOption,
		MdProgressCircular,
		MdProgressLinear,
		MdSelect,
		MdSidenav,
		MdSlider,
		MdSubheader,
		MdSwitch,
		MdTab,
		MdTabs,
		MdToolbar,
		MdTooltip
	],
	entryComponents: [
		AppComponent,
		FileInput,
		Help,
		Register
	],
	imports: [
		BrowserModule,
		CommonModule,
		FormsModule,
		UpgradeModule
	]
})
export class AppModule {
	/** @ignore */
	public ngDoBootstrap () : void {}
}
