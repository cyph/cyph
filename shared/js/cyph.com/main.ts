/**
 * @file Entry point of cyph.com.
 */

/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/fakecrypto.ts" />
/// <reference path="../preload/fakefirebase.ts" />
/// <reference path="../preload/jquery.ts" />

import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as Cyph from '../cyph';
import {loaded} from '../preload';
import {AppComponent} from './appcomponent';
import {AppModule} from './appmodule';
import {CyphDemo} from './cyphdemo';
import {Elements} from './elements';
import {HomeSections, pageTitles, Promos, States} from './enums';
import {UI} from './ui';


Cyph.UI.Elements.body().attr(
	'ng-controller',
	Cyph.Config.angularConfig.rootController
);

angular.
	module(Cyph.Config.angularConfig.rootModule, ['ngMaterial']).
	controller(Cyph.Config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',
		'$mdSidenav',

		($mdDialog, $mdToast, $mdSidenav) => {
			cyph		= Cyph;
			cyph.com	= {
				CyphDemo,
				Elements,
				HomeSections,
				pageTitles,
				Promos,
				States,
				UI
			};

			ui	= new UI(
				() => $mdSidenav('main-toolbar-sidenav'),
				new Cyph.UI.DialogManager($mdDialog, $mdToast)
			);
		}
	]).
	config(Cyph.Config.angularConfig.config).
	component(
		Cyph.UI.Components.Material.MdButton.title,
		Cyph.UI.Components.Material.MdButton.config
	).
	component(
		Cyph.UI.Components.Material.MdCard.title,
		Cyph.UI.Components.Material.MdCard.config
	).
	component(
		Cyph.UI.Components.Material.MdCardContent.title,
		Cyph.UI.Components.Material.MdCardContent.config
	).
	component(
		Cyph.UI.Components.Material.MdCardHeader.title,
		Cyph.UI.Components.Material.MdCardHeader.config
	).
	component(
		Cyph.UI.Components.Material.MdCardHeaderText.title,
		Cyph.UI.Components.Material.MdCardHeaderText.config
	).
	component(
		Cyph.UI.Components.Material.MdCardTitle.title,
		Cyph.UI.Components.Material.MdCardTitle.config
	).
	component(
		Cyph.UI.Components.Material.MdCardTitleText.title,
		Cyph.UI.Components.Material.MdCardTitleText.config
	).
	component(
		Cyph.UI.Components.Material.MdContent.title,
		Cyph.UI.Components.Material.MdContent.config
	).
	component(
		Cyph.UI.Components.Material.MdFabActions.title,
		Cyph.UI.Components.Material.MdFabActions.config
	).
	component(
		Cyph.UI.Components.Material.MdFabSpeedDial.title,
		Cyph.UI.Components.Material.MdFabSpeedDial.config
	).
	component(
		Cyph.UI.Components.Material.MdFabTrigger.title,
		Cyph.UI.Components.Material.MdFabTrigger.config
	).
	component(
		Cyph.UI.Components.Material.MdIcon.title,
		Cyph.UI.Components.Material.MdIcon.config
	).
	component(
		Cyph.UI.Components.Material.MdInputContainer.title,
		Cyph.UI.Components.Material.MdInputContainer.config
	).
	component(
		Cyph.UI.Components.Material.MdList.title,
		Cyph.UI.Components.Material.MdList.config
	).
	component(
		Cyph.UI.Components.Material.MdListItem.title,
		Cyph.UI.Components.Material.MdListItem.config
	).
	component(
		Cyph.UI.Components.Material.MdMenu.title,
		Cyph.UI.Components.Material.MdMenu.config
	).
	component(
		Cyph.UI.Components.Material.MdMenuContent.title,
		Cyph.UI.Components.Material.MdMenuContent.config
	).
	component(
		Cyph.UI.Components.Material.MdMenuItem.title,
		Cyph.UI.Components.Material.MdMenuItem.config
	).
	component(
		Cyph.UI.Components.Material.MdOption.title,
		Cyph.UI.Components.Material.MdOption.config
	).
	component(
		Cyph.UI.Components.Material.MdProgressCircular.title,
		Cyph.UI.Components.Material.MdProgressCircular.config
	).
	component(
		Cyph.UI.Components.Material.MdProgressLinear.title,
		Cyph.UI.Components.Material.MdProgressLinear.config
	).
	component(
		Cyph.UI.Components.Material.MdSelect.title,
		Cyph.UI.Components.Material.MdSelect.config
	).
	component(
		Cyph.UI.Components.Material.MdSidenav.title,
		Cyph.UI.Components.Material.MdSidenav.config
	).
	component(
		Cyph.UI.Components.Material.MdSlider.title,
		Cyph.UI.Components.Material.MdSlider.config
	).
	component(
		Cyph.UI.Components.Material.MdSubheader.title,
		Cyph.UI.Components.Material.MdSubheader.config
	).
	component(
		Cyph.UI.Components.Material.MdSwitch.title,
		Cyph.UI.Components.Material.MdSwitch.config
	).
	component(
		Cyph.UI.Components.Material.MdTab.title,
		Cyph.UI.Components.Material.MdTab.config
	).
	component(
		Cyph.UI.Components.Material.MdTabs.title,
		Cyph.UI.Components.Material.MdTabs.config
	).
	component(
		Cyph.UI.Components.Material.MdToolbar.title,
		Cyph.UI.Components.Material.MdToolbar.config
	).
	component(
		Cyph.UI.Components.Material.MdTooltip.title,
		Cyph.UI.Components.Material.MdTooltip.config
	).
	directive(
		'cyphHelp',
		downgradeComponent({component: Cyph.UI.Components.Help})
	).
	directive(
		'cyphRegister',
		downgradeComponent({component: Cyph.UI.Components.Register})
	).
	directive(
		'cyphApp',
		downgradeComponent({component: AppComponent})
	)
;


(async () => (
	<UpgradeModule>
	(
		await platformBrowser().bootstrapModule(AppModule)
	).injector.get(UpgradeModule)
).bootstrap(
	document.body,
	[Cyph.Config.angularConfig.rootModule]
))();


/* Redirect to Onion site when on Tor */

if (!Cyph.Env.isOnion) {
	(async () => {
		const response: string	= await Cyph.Util.request({
			discardErrors: true,
			url: `https://ping.${Cyph.Config.onionRoot}`
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


export {loaded};
