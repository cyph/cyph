import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
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
	LinkConnection,
	Markdown,
	SignupForm,
	StaticCyphNotFound,
	StaticCyphSpinningUp,
	StaticFooter
} from '../cyph/ui/components';
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
		LinkConnection,
		Markdown,
		SignupForm,
		StaticCyphNotFound,
		StaticCyphSpinningUp,
		StaticFooter,
		Translate
	],
	entryComponents: [
		AppComponent
	],
	imports: [
		BrowserModule,
		CommonModule,
		UpgradeModule
	]
})
export class AppModule {
	/** @ignore */
	public ngDoBootstrap () : void {}
}
