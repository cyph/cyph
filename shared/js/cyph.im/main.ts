/// <reference path="../global/strict.ts" />

/// <reference path="../preload/cryptoInit.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/translations.ts" />
/// <reference path="../preload/base.ts" />

/// <reference path="../global/ngmarkdown.ts" />
/// <reference path="../cyph/ui/chat/chat.ts" />
/// <reference path="../cyph/ui/dialogmanager.ts" />
/// <reference path="../cyph/ui/notifier.ts" />
/// <reference path="../cyph/ui/signupform.ts" />
/// <reference path="ui/enums.ts" />
/// <reference path="ui/ui.ts" />


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


			let controller: Cyph.IController	= {
				update: () : void => {
					let phase: string	= $scope.$root.$$phase;

					if (phase !== '$apply' && phase !== '$digest') {
						$scope.$apply();
					}
				}
			};

			let mobileMenu: Cyph.UI.ISidebar	= Cyph.Env.isMobile ?
				$mdSidenav('menu') :
				{
					close: () => {},
					open: () => {}
				}
			;

			let dialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
			let notifier: Cyph.UI.INotifier				= new Cyph.UI.Notifier;

			$scope.Cyph	= Cyph;
			$scope.ui	= new Cyph.im.UI.UI(controller, dialogManager, mobileMenu, notifier);

			self['ui']	= $scope.ui;


			history.pushState({}, '', location.pathname);
			self.onhashchange	= () => location.reload();
		})
	]).
	config([
		'$compileProvider',

		$compileProvider => $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/)
	]);
;
