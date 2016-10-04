/**
 * @file Entry point of cyph.im.
 */


/// <reference path="../preload/crypto.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/dompurify.ts" />
/// <reference path="../preload/jquery.ts" />
/// <reference path="../preload/translations.ts" />
/// <reference path="../global/base.ts" />

import {Config} from 'config';
import {BetaStates, States, UrlSections} from 'ui/enums';
import {UI} from 'ui/ui';
import * as Cyph from 'cyph/cyph';
import {Loaded} from 'preload/base';


Cyph.UI.Elements.html.attr('ng-controller', Cyph.Config.angularConfig.rootController);

angular.
	module(Cyph.Config.angularConfig.rootModule, [
		'ngMaterial',
		'timer',
		Cyph.UI.Directives.ChatCyphertext.title,
		Cyph.UI.Directives.ChatMain.title,
		Cyph.UI.Directives.ChatMessageBox.title,
		Cyph.UI.Directives.ChatToolbar.title,
		Cyph.UI.Directives.Contact.title,
		Cyph.UI.Directives.LinkConnection.title,
		Cyph.UI.Directives.Markdown.title,
		Cyph.UI.Directives.Beta.title,
		Cyph.UI.Directives.SignupForm.title,
		Cyph.UI.Directives.StaticCyphNotFound.title,
		Cyph.UI.Directives.StaticCyphSpinningUp.title,
		Cyph.UI.Directives.StaticFooter.title
	]).
	controller(Cyph.Config.angularConfig.rootController, [
		'$scope',
		'$mdDialog',
		'$mdToast',

		($scope, $mdDialog, $mdToast) => {
			self['Cyph']	= Cyph;
			$scope.Cyph		= Cyph;
			$scope.Cyph.im	= {
				Config,
				UI: {
					BetaStates,
					States,
					UI,
					UrlSections
				}
			};

			$(() => {
				Cyph.UI.Elements.load();

				const controller: Cyph.IController			= new Cyph.Controller($scope);
				const dialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
				const notifier: Cyph.UI.INotifier			= new Cyph.UI.Notifier();

				$scope.ui	= new UI(controller, dialogManager, notifier);
				self['ui']	= $scope.ui;

				controller.update();
			});
		}
	]).
	config(Cyph.Config.angularConfig.config)
;

angular.bootstrap(document, [Cyph.Config.angularConfig.rootModule]);


export {Loaded};
