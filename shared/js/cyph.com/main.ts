/**
 * @file Entry point of cyph.com.
 */

/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/fakecrypto.ts" />
/// <reference path="../preload/jquery.ts" />

import {AppModule} from './appmodule';
import {CyphDemo} from './cyphdemo';
import {Elements} from './elements';
import {HomeSections, PageTitles, Promos, States} from './enums';
import {UI} from './ui';
import {Loaded} from '../preload';
import * as Cyph from '../cyph';


Cyph.UI.Elements.body.attr(
	'ng-controller',
	Cyph.Config.angularConfig.rootController
);

angular.
	module(Cyph.Config.angularConfig.rootModule, [
		'ngMaterial',
		Cyph.UI.Components.Home.title
	]).
	controller(Cyph.Config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',
		'$mdSidenav',

		($mdDialog, $mdToast, $mdSidenav) => {
			self['Cyph']		= Cyph;
			self['Cyph'].com	= {
				CyphDemo,
				Elements,
				HomeSections,
				PageTitles,
				Promos,
				States,
				UI
			};

			$(() => {
				Elements.load();

				self['ui']	= new UI(
					() => $mdSidenav('main-toolbar-sidenav'),
					new Cyph.UI.DialogManager($mdDialog, $mdToast)
				);
			});
		}
	]).
	config(Cyph.Config.angularConfig.config)
;


AppModule.upgradeAdapter.bootstrap(
	document.body,
	[Cyph.Config.angularConfig.rootModule]
);


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
