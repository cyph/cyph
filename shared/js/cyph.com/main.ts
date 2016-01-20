/**
 * @file Entry point of cyph.com.
 */


/// <reference path="../preload/fakecrypto.ts" />
/// <reference path="../preload/base.ts" />

/// <reference path="../cyph/controller.ts" />
/// <reference path="../cyph/session/session.ts" />
/// <reference path="../cyph/ui/chat/chat.ts" />
/// <reference path="../cyph/ui/carousel.ts" />
/// <reference path="../cyph/ui/dialogmanager.ts" />
/// <reference path="../cyph/ui/signupform.ts" />
/// <reference path="../cyph/ui/directives/chat.ts" />
/// <reference path="../cyph/ui/directives/markdown.ts" />
/// <reference path="../cyph/ui/directives/signupform.ts" />
/// <reference path="ui/enums.ts" />
/// <reference path="ui/elements.ts" />
/// <reference path="ui/cyphdemo.ts" />
/// <reference path="ui/ui.ts" />

/*
	cyph.com works fine in every browser except IE/Edge.
	Until Microsoft fixes their shit, it's their problem, not ours.
*/

if (Cyph.Env.isIEOrEdge) {
	location.pathname	= '/unsupportedbrowser';
}


angular.
	module('Cyph', [
		'ngMaterial',
		Cyph.UI.Directives.Chat.title,
		Cyph.UI.Directives.Markdown.title,
		Cyph.UI.Directives.SignupForm.title
	]).
	controller('CyphController', [
		'$scope',
		'$mdDialog',
		'$mdToast',
		'$mdSidenav',
		'chatSidenav',

		($scope, $mdDialog, $mdToast, $mdSidenav, chatSidenav) => $(() => {
			Cyph.com.UI.Elements.load();

			const controller: Cyph.IController				= new Cyph.Controller($scope);
			const mobileMenu: Cyph.UI.ISidebar				= $mdSidenav('main-toolbar-sidenav');
			const demoDialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
			const demoMobileMenu: Cyph.UI.ISidebar			= chatSidenav();

			$scope.Cyph	= Cyph;
			$scope.ui	= new Cyph.com.UI.UI(controller, mobileMenu, demoDialogManager, demoMobileMenu);

			self['ui']	= $scope.ui;

			controller.update();
		})
	])
;


/* Redirect to Onion site when on Tor */

if (!Cyph.Env.isOnion) {
	Cyph.Util.request({
		url: `https://ping.${Cyph.Config.onionRoot}`,
		success: (data: string) => {
			if (data === 'pong') {
				locationData.href	=
					'https://' +
					Cyph.Config.onionRoot +
					locationData.href.split(locationData.host + '/')[1]
				;
			}
		}
	});
}
