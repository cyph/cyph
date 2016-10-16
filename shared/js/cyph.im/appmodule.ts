import {AppComponent} from './appcomponent';
import {CommonModule} from '@angular/common';
import {NgModule, forwardRef} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {UpgradeAdapter as NgUpgradeAdapter} from '@angular/upgrade';
import * as Cyph from '../cyph';


export const UpgradeAdapter	= new NgUpgradeAdapter(
	forwardRef(() => AppModule)
);


@NgModule({
	imports: [
		BrowserModule,
		CommonModule
	],
	declarations: [
		AppComponent,
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.Beta.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatCyphertext.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatMain.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatMessageBox.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.ChatToolbar.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.FileInput.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.LinkConnection.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.Markdown.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.SignupForm.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.StaticCyphNotFound.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.StaticCyphSpinningUp.title
		),
		UpgradeAdapter.upgradeNg1Component(
			Cyph.UI.Components.StaticFooter.title
		)
	]
})
export class AppModule {}
