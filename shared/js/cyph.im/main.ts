/**
 * @file Entry point of cyph.im.
 */


/// <reference path="../preload/capabilities.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/dompurify.ts" />
/// <reference path="../preload/jquery.ts" />

import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as Cyph from '../cyph';
import {loaded} from '../preload';
import {AppComponent} from './appcomponent';
import {AppModule} from './appmodule';
import {BetaStates, States, urlSections} from './enums';
import {UI} from './ui';


if (Cyph.Env.isEdge) {
	location.pathname	= '/unsupportedbrowser';
}


Cyph.UI.Elements.body().attr(
	'ng-controller',
	Cyph.Config.angularConfig.rootController
);

angular.
	module(Cyph.Config.angularConfig.rootModule, ['ngMaterial']).
	controller(Cyph.Config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',

		($mdDialog, $mdToast) => {
			cyph	= Cyph;
			cyph.im	= {
				BetaStates,
				States,
				UI,
				urlSections
			};

			ui	= new UI(
				new Cyph.UI.DialogManager($mdDialog, $mdToast),
				new Cyph.UI.Notifier()
			);
		}
	]).
	config(Cyph.Config.angularConfig.config).
	component(
		Cyph.UI.Components.Beta.title,
		Cyph.UI.Components.Beta.config
	).
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
		Cyph.UI.Components.Contact.title,
		Cyph.UI.Components.Contact.config
	).
	component(
		Cyph.UI.Components.FileInput.title,
		Cyph.UI.Components.FileInput.config
	).
	component(
		Cyph.UI.Components.LinkConnection.title,
		Cyph.UI.Components.LinkConnection.config
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
		Cyph.UI.Components.StaticCyphNotFound.title,
		Cyph.UI.Components.StaticCyphNotFound.config
	).
	component(
		Cyph.UI.Components.StaticFooter.title,
		Cyph.UI.Components.StaticFooter.config
	).
	directive(
		Cyph.UI.Directives.Translate.title,
		Cyph.UI.Directives.Translate.config
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


export {loaded};
