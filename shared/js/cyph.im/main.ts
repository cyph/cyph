/// <reference path="../preload/crypto.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/translations.ts" />
/// <reference path="../preload/base.ts" />

/// <reference path="../cyph/controller.ts" />
/// <reference path="../cyph/ui/chat/chat.ts" />
/// <reference path="../cyph/ui/chat/templates.ts" />
/// <reference path="../cyph/ui/dialogmanager.ts" />
/// <reference path="../cyph/ui/notifier.ts" />
/// <reference path="../cyph/ui/signupform.ts" />
/// <reference path="../cyph/ui/directives/chat.ts" />
/// <reference path="../cyph/ui/directives/markdown.ts" />
/// <reference path="../cyph/ui/directives/signupform.ts" />
/// <reference path="config.ts" />
/// <reference path="ui/enums.ts" />
/// <reference path="ui/ui.ts" />


try {
	navigator['serviceWorker'].
		register(Cyph.Config.webSignConfig.serviceWorker).
		catch(() => {})
	;
}
catch (_) {}


angular.
	module('Cyph', [
		'ngMaterial',
		'timer',
		Cyph.UI.Directives.Chat.title,
		Cyph.UI.Directives.Markdown.title,
		Cyph.UI.Directives.SignupForm.title
	]).
	controller('CyphController', [
		'$scope',
		'$mdDialog',
		'$mdToast',
		'chatSidenav',

		($scope, $mdDialog, $mdToast, chatSidenav) => $(() => {
			Cyph.UI.Elements.load();

			let controller: Cyph.IController			= new Cyph.Controller($scope);
			let dialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
			let notifier: Cyph.UI.INotifier				= new Cyph.UI.Notifier;

			let mobileMenu: Cyph.UI.ISidebar	=
				Cyph.Env.isMobile ?
					chatSidenav() :
					{close: () => {}, open: () => {}}
			;

			$scope.Cyph	= Cyph;
			$scope.ui	= new Cyph.im.UI.UI(controller, dialogManager, mobileMenu, notifier);

			self['ui']	= $scope.ui;
		})
	]).
	config([
		'$compileProvider',

		$compileProvider => $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/)
	])
;
