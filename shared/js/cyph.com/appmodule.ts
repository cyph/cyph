import {AppComponent} from './appcomponent';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeModule} from '@angular/upgrade/static';
import * as Cyph from '../cyph';


@NgModule({
	imports: [
		BrowserModule,
		CommonModule,
		UpgradeModule
	],
	declarations: [
		AppComponent,
		Cyph.UI.Components.ChatCyphertext,
		Cyph.UI.Components.ChatMain,
		Cyph.UI.Components.ChatMessageBox,
		Cyph.UI.Components.Checkout,
		Cyph.UI.Components.Contact,
		Cyph.UI.Components.FileInput,
		Cyph.UI.Components.Markdown,
		Cyph.UI.Components.SignupForm
	]
})
export class AppModule {}
