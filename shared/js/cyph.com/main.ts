/**
 * @file Entry point of cyph.com.
 */

import 'preload/fakecrypto';
import 'preload/base';
import {Elements} from 'ui/elements';
import {UI} from 'ui/ui';
import * as Cyph from 'cyph/cyph';
import {locationData} from 'global/base';


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
			Elements.load();

			const controller: Cyph.IController				= new Cyph.Controller($scope);
			const mobileMenu: Cyph.UI.ISidebar				= $mdSidenav('main-toolbar-sidenav');
			const demoDialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);
			const demoMobileMenu: Cyph.UI.ISidebar			= chatSidenav();

			$scope.Cyph	= Cyph;
			$scope.ui	= new UI(controller, mobileMenu, demoDialogManager, demoMobileMenu);

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
