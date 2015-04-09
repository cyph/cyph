/// <reference path="init.ts" />
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
			Controller	= $scope;

			Controller.$mdSidenav	= $mdSidenav;
			Controller.$mdToast		= $mdToast;
			Controller.$mdDialog	= $mdDialog;

			Controller.update		= Controller.apply;


			/* TODO: Bind Controller to classes */


			$(Init);
		}
	]).
	config([
		'$compileProvider',

		$compileProvider => {
			$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sms):/);
		}
	]);
;
