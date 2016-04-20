/**
 * @file Entry point of cyph.im.
 */


/// <reference path="../preload/crypto.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/dompurify.ts" />
/// <reference path="../preload/jquery.ts" />
/// <reference path="../preload/fonts.ts" />
/// <reference path="../preload/translations.ts" />
/// <reference path="../global/base.ts" />

import {Config} from 'config';
import {ProStates, States, UrlSections} from 'ui/enums';
import {UI} from 'ui/ui';
import * as Cyph from 'cyph/cyph';
import {Loaded} from 'preload/base';


Cyph.UI.Elements.body.attr('ng-controller', Cyph.Config.angularConfig.rootController);

angular.
	module(Cyph.Config.angularConfig.rootModule, [
		'ngMaterial',
		'timer',
		Cyph.UI.Directives.Chat.title,
		Cyph.UI.Directives.LinkConnection.title,
		Cyph.UI.Directives.Markdown.title,
		Cyph.UI.Directives.Pro.title,
		Cyph.UI.Directives.SignupForm.title,
		Cyph.UI.Directives.Static.title
	]).
	controller(Cyph.Config.angularConfig.rootController, [
		'$scope',
		'$mdDialog',
		'$mdToast',
		'chatSidenav',

		($scope, $mdDialog, $mdToast, chatSidenav) => {
			self['Cyph']	= Cyph;
			$scope.Cyph		= Cyph;
			$scope.Cyph.im	= {
				Config,
				UI: {
					ProStates,
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

				const mobileMenu: Cyph.UI.ISidebar	=
					Cyph.Env.isMobile ?
						chatSidenav() :
						{close: () => {}, open: () => {}}
				;

				$scope.ui	= new UI(controller, dialogManager, mobileMenu, notifier);
				self['ui']	= $scope.ui;

				controller.update();
			});
		}
	]).
	config([
		'$compileProvider',
		$compileProvider => $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/)
	])
;

angular.bootstrap(document, [Cyph.Config.angularConfig.rootModule]);


export {Loaded};
