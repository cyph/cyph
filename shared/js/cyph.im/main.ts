/**
 * @file Entry point of cyph.im.
 */


import * as PreloadA from 'preload/crypto';
import * as PreloadB from 'preload/unsupportedbrowsers';
import * as PreloadC from 'preload/dompurify';
import * as PreloadD from 'preload/jquery';
import * as PreloadE from 'preload/fonts';
import * as PreloadF from 'preload/translations';
import * as PreloadG from 'preload/base';
import {Config} from 'config';
import {ProStates, States, UrlSections} from 'ui/enums';
import {UI} from 'ui/ui';
import * as Cyph from 'cyph/cyph';


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

		($scope, $mdDialog, $mdToast, chatSidenav) => $(() => {
			Cyph.UI.Elements.load();

			const controller: Cyph.IController			= new Cyph.Controller($scope);
			const dialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
			const notifier: Cyph.UI.INotifier			= new Cyph.UI.Notifier();

			const mobileMenu: Cyph.UI.ISidebar	=
				Cyph.Env.isMobile ?
					chatSidenav() :
					{close: () => {}, open: () => {}}
			;

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

			$scope.ui		= new UI(controller, dialogManager, mobileMenu, notifier);

			self['Cyph']	= $scope.Cyph;
			self['ui']		= $scope.ui;
		})
	]).
	config([
		'$compileProvider',

		$compileProvider => $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/)
	])
;

Cyph.UI.Elements.body.attr('ng-controller', Cyph.Config.angularConfig.rootController);
angular.bootstrap(document, [Cyph.Config.angularConfig.rootModule]);
