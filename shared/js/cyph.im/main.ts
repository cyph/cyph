/// <reference path="ui/ui.ts" />
/// <reference path="../cyph/icontroller.ts" />
/// <reference path="../cyph/ui/elements.ts" />
/// <reference path="../cyph/ui/idialogmanager.ts" />
/// <reference path="../cyph/ui/inotifier.ts" />
/// <reference path="../cyph/ui/isidebar.ts" />
/// <reference path="../global/ngmarkdown.ts" />
/// <reference path="../../lib/typings/angularjs/angular.d.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


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

		($scope, $mdSidenav, $mdToast, $mdDialog) => {
			$(() => {
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


				$scope.Cyph			= Cyph;
				$scope.Cyph.UI		= Cyph.UI;
				$scope.Cyph.im		= Cyph.im;
				$scope.Cyph.im.UI	= Cyph.im.UI;
				$scope.ui			= new Cyph.im.UI.UI(controller, dialogManager, mobileMenu, notifier);


				history.pushState({}, '', location.pathname);
				self.onhashchange = () => location.reload();
			});
		}
	]).
	config([
		'$compileProvider',

		$compileProvider => {
			$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/);
		}
	]);
;
