/// <reference path="../preload/cryptoinit.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/translations.ts" />
/// <reference path="../preload/base.ts" />

/// <reference path="../global/ngmarkdown.ts" />
/// <reference path="../cyph/controller.ts" />
/// <reference path="../cyph/ui/chat/chat.ts" />
/// <reference path="../cyph/ui/dialogmanager.ts" />
/// <reference path="../cyph/ui/notifier.ts" />
/// <reference path="../cyph/ui/signupform.ts" />
/// <reference path="ui/enums.ts" />
/// <reference path="ui/ui.ts" />


try {
	navigator['serviceWorker'].register(Cyph.Config.webSignConfig.serviceWorker);
}
catch (_) {}


angular.
	module('Cyph', [
		'ngMarkdown',
		'ngMaterial',
		'timer'
	]).
	controller('CyphController', [
		'$scope',
		'$mdSidenav',
		'$mdToast',
		'$mdDialog',

		($scope, $mdSidenav, $mdToast, $mdDialog) => $(() => {
			Cyph.UI.Elements.load();


			let controller: Cyph.IController			= new Cyph.Controller($scope);
			let dialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
			let notifier: Cyph.UI.INotifier				= new Cyph.UI.Notifier;

			let mobileMenu: Cyph.UI.ISidebar	= Cyph.Env.isMobile ?
				$mdSidenav('menu') :
				{
					close: () => {},
					open: () => {}
				}
			;

			$scope.Cyph	= Cyph;
			$scope.ui	= new Cyph.im.UI.UI(controller, dialogManager, mobileMenu, notifier);


			/* debugging */
			if (Cyph.Env.isLocalhost) {
				self['ui']	= $scope.ui;
			}
		})
	]).
	config([
		'$compileProvider',

		$compileProvider => $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/)
	]);
;
