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
import {AppComponent} from './appcomponent';
import {HomeComponent} from './homecomponent';


@NgModule({
	imports: [
		BrowserModule,
		CommonModule,
		UpgradeModule
	],
	entryComponents: [
		AppComponent
	],
	declarations: [
		AppComponent,
		Beta,
		ChatCyphertext,
		ChatMain,
		ChatMessageBox,
		Checkout,
		Contact,
		FileInput,
		HomeComponent,
		LinkConnection,
		Markdown,
		SignupForm,
		StaticCyphNotFound,
		StaticCyphSpinningUp,
		StaticFooter
	]
})
export class AppModule {
	ngDoBootstrap () {}
}
