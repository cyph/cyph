/**
 * @file Entry point of cyph.im.
 */


/// <reference path="../preload/crypto.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/dompurify.ts" />
/// <reference path="../preload/jquery.ts" />
/// <reference path="../preload/translations.ts" />

import {AppModule} from './appmodule';
import {BetaStates, States, UrlSections} from './enums';
import {UI} from './ui';
import {Loaded} from '../preload';
import * as Cyph from '../cyph';


if (Cyph.Env.isEdge) {
	location.pathname	= '/unsupportedbrowser';
}


Cyph.UI.Elements.body.attr('ng-controller', Cyph.Config.angularConfig.rootController);

angular.
	module(Cyph.Config.angularConfig.rootModule, [
		'ngMaterial',
		Cyph.UI.Components.App.title
	]).
	controller(Cyph.Config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',

		($mdDialog, $mdToast) => {
			self['Cyph']	= Cyph;
			self['Cyph'].im	= {
				BetaStates,
				States,
				UI,
				UrlSections
			};

			$(() => {
				Cyph.UI.Elements.load();

				const dialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
				const notifier: Cyph.UI.INotifier			= new Cyph.UI.Notifier();

				self['ui']	= new UI(dialogManager, notifier);
			});
		}
	]).
	config(Cyph.Config.angularConfig.config)
;


AppModule.upgradeAdapter.bootstrap(
	document.body,
	[Cyph.Config.angularConfig.rootModule]
);


export {Loaded};
