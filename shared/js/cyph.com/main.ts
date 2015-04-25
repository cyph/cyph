/// <reference path="../preload/base.ts" />

/// <reference path="../cyph/controller.ts" />
/// <reference path="../cyph/ui/signupform.ts" />
/// <reference path="ui/enums.ts" />
/// <reference path="ui/elements.ts" />
/// <reference path="ui/backgroundvideomanager.ts" />
/// <reference path="ui/ui.ts" />


angular.
	module('Cyph', [
		'ngMaterial'
	]).
	controller('CyphController', [
		'$scope',

		($scope) => $(() => {
			Cyph.com.UI.Elements.load();

			let controller: Cyph.IController	= new Cyph.Controller($scope);

			$scope.Cyph	= Cyph;
			$scope.ui	= new Cyph.com.UI.UI(controller);

			self['ui']	= $scope.ui;

			controller.update();
		})
	])
;


/* Redirect to Onion site when on Tor */

if (!Cyph.Env.isOnion) {
	Cyph.Util.request({
		url: Cyph.Config.onionUrl + 'ping',
		success: (data: string) => {
			if (data === 'pong') {
				location.href	=
					Cyph.Config.onionUrl +
					location.toString().split(location.host + '/')[1]
				;
			}
		}
	});
}
