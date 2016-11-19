/**
 * @file Entry point of cyph.com.
 */

/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/fakecrypto.ts" />
/// <reference path="../preload/jquery.ts" />

import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as Cyph from '../cyph';
import {Loaded} from '../preload';
import {AppComponent} from './appcomponent';
import {AppModule} from './appmodule';
import {CyphDemo} from './cyphdemo';
import {Elements} from './elements';
import {HomeSections, PageTitles, Promos, States} from './enums';
import {HomeComponent} from './homecomponent';
import {UI} from './ui';


Cyph.UI.Elements.body().attr(
	'ng-controller',
	Cyph.Config.angularConfig.rootController
);

angular.
	module(Cyph.Config.angularConfig.rootModule, ['ngMaterial']).
	controller(Cyph.Config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',
		'$mdSidenav',

		($mdDialog, $mdToast, $mdSidenav) => {
			self['Cyph']		= Cyph;
			self['Cyph'].com	= {
				CyphDemo,
				Elements,
				HomeSections,
				PageTitles,
				Promos,
				States,
				UI
			};

			self['ui']	= new UI(
				() => $mdSidenav('main-toolbar-sidenav'),
				new Cyph.UI.DialogManager($mdDialog, $mdToast)
			);
		}
	]).
	config(Cyph.Config.angularConfig.config).
	component(
		Cyph.UI.Components.ChatCyphertext.title,
		Cyph.UI.Components.ChatCyphertext.config
	).
	component(
		Cyph.UI.Components.ChatMain.title,
		Cyph.UI.Components.ChatMain.config
	).
	component(
		Cyph.UI.Components.ChatMessageBox.title,
		Cyph.UI.Components.ChatMessageBox.config
	).
	component(
		Cyph.UI.Components.Checkout.title,
		Cyph.UI.Components.Checkout.config
	).
	component(
		Cyph.UI.Components.Contact.title,
		Cyph.UI.Components.Contact.config
	).
	component(
		Cyph.UI.Components.FileInput.title,
		Cyph.UI.Components.FileInput.config
	).
	component(
		Cyph.UI.Components.Markdown.title,
		Cyph.UI.Components.Markdown.config
	).
	component(
		Cyph.UI.Components.SignupForm.title,
		Cyph.UI.Components.SignupForm.config
	).
	component(
		HomeComponent.title,
		HomeComponent.config
	).
	directive(
		'cyphApp',
		downgradeComponent({component: AppComponent})
	)
;


(async () => (
	<UpgradeModule>
	(
		await platformBrowser().bootstrapModule(AppModule)
	).injector.get(UpgradeModule)
).bootstrap(
	document.body,
	[Cyph.Config.angularConfig.rootModule]
))();


/* Redirect to Onion site when on Tor */

if (!Cyph.Env.isOnion) {
	(async () => {
		const response: string	= await Cyph.Util.request({
			url: `https://ping.${Cyph.Config.onionRoot}`,
			discardErrors: true
		});

		if (response === 'pong') {
			locationData.href	=
				'https://' +
				Cyph.Config.onionRoot +
				locationData.href.split(locationData.host + '/')[1]
			;
		}
	})();
}


export {Loaded};
