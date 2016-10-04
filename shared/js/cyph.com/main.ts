/**
 * @file Entry point of cyph.com.
 */

/// <reference path="../preload/fakecrypto.ts" />
/// <reference path="../preload/jquery.ts" />
/// <reference path="../global/base.ts" />

import {CyphDemo} from './ui/cyphdemo';
import {Elements} from './ui/elements';
import {HomeSections, PageTitles, Promos, States} from './ui/enums';
import {UI} from './ui/ui';
import * as Cyph from '../cyph';
import {Loaded} from '../preload/base';


if (Cyph.Env.isIE) {
	location.pathname	= '/unsupportedbrowser';
}


Cyph.UI.Elements.html.attr('ng-controller', Cyph.Config.angularConfig.rootController);

angular.
	module(Cyph.Config.angularConfig.rootModule, [
		'ngMaterial',
		Cyph.UI.Components.ChatCyphertext.title,
		Cyph.UI.Components.ChatMain.title,
		Cyph.UI.Components.ChatMessageBox.title,
		Cyph.UI.Components.ChatToolbar.title,
		Cyph.UI.Components.Checkout.title,
		Cyph.UI.Components.Contact.title,
		Cyph.UI.Components.SignupForm.title,
		Cyph.UI.Directives.Markdown.title
	]).
	controller(Cyph.Config.angularConfig.rootController, [
		'$scope',
		'$mdDialog',
		'$mdToast',
		'$mdSidenav',

		($scope, $mdDialog, $mdToast, $mdSidenav) => {
			self['Cyph']	= Cyph;
			$scope.Cyph		= Cyph;
			$scope.Cyph.com	= {
				UI: {
					CyphDemo,
					Elements,
					HomeSections,
					PageTitles,
					Promos,
					States,
					UI
				}
			};

			$(() => {
				Elements.load();

				const controller: Cyph.IController				= new Cyph.Controller($scope);
				const mobileMenu: () => Cyph.UI.ISidebar		= () => $mdSidenav('main-toolbar-sidenav');
				const demoDialogManager: Cyph.UI.IDialogManager	= new Cyph.UI.DialogManager($mdDialog, $mdToast);

				$scope.ui	= new UI(controller, mobileMenu, demoDialogManager);
				self['ui']	= $scope.ui;

				controller.update();
			});
		}
	]).
	config(Cyph.Config.angularConfig.config)
;

angular.bootstrap(document, [Cyph.Config.angularConfig.rootModule]);


/* Redirect to Onion site when on Tor */

if (!Cyph.Env.isOnion) {
	(async () => {
		const response: string	= await Cyph.Util.request({
			url: `https://ping.${Cyph.Config.onionRoot}`,
			discardErrors: true
		});

		if (response === 'pong') {
			locationData.href	=
				'https://' +
				Cyph.Config.onionRoot +
				locationData.href.split(locationData.host + '/')[1]
			;
		}
	})();
}


export {Loaded};
