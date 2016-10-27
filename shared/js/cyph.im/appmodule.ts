import {AppComponent} from './appcomponent';
import {CommonModule} from '@angular/common';
import {NgModule, forwardRef} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeAdapter} from '@angular/upgrade';
import * as Cyph from '../cyph';


export const upgradeAdapter	= new UpgradeAdapter(
	forwardRef(() => AppModule)
);


@NgModule({
	imports: [
		BrowserModule,
		CommonModule
	],
	declarations: [
		AppComponent,
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.Beta.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatCyphertext.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatMain.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatMessageBox.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.FileInput.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.LinkConnection.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.Markdown.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.SignupForm.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.StaticCyphNotFound.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.StaticCyphSpinningUp.title
		),
		upgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.StaticFooter.title
		)
	]
})
export class AppModule {}
