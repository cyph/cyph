/**
 * @file Entry point of cyph.com.
 */

/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/fakecrypto.ts" />
/// <reference path="../preload/fakefirebase.ts" />
/// <reference path="../preload/jquery.ts" />

import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as angular from 'angular';
import {config} from '../cyph/config';
import {env} from '../cyph/env';
import {eventManager} from '../cyph/eventmanager';
import {FileInput} from '../cyph/ui/components/fileinput';
import {Help} from '../cyph/ui/components/help';
import {MdButton} from '../cyph/ui/components/material/mdbutton';
import {MdCard} from '../cyph/ui/components/material/mdcard';
import {MdCardContent} from '../cyph/ui/components/material/mdcardcontent';
import {MdCardHeader} from '../cyph/ui/components/material/mdcardheader';
import {MdCardHeaderText} from '../cyph/ui/components/material/mdcardheadertext';
import {MdCardTitle} from '../cyph/ui/components/material/mdcardtitle';
import {MdCardTitleText} from '../cyph/ui/components/material/mdcardtitletext';
import {MdContent} from '../cyph/ui/components/material/mdcontent';
import {MdFabSpeedDial} from '../cyph/ui/components/material/mdfabspeeddial';
import {MdIcon} from '../cyph/ui/components/material/mdicon';
import {MdInput} from '../cyph/ui/components/material/mdinput';
import {MdList} from '../cyph/ui/components/material/mdlist';
import {MdListItem} from '../cyph/ui/components/material/mdlistitem';
import {MdMenu} from '../cyph/ui/components/material/mdmenu';
import {MdProgressCircular} from '../cyph/ui/components/material/mdprogresscircular';
import {MdProgressLinear} from '../cyph/ui/components/material/mdprogresslinear';
import {MdSelect} from '../cyph/ui/components/material/mdselect';
import {MdSidenav} from '../cyph/ui/components/material/mdsidenav';
import {MdSlider} from '../cyph/ui/components/material/mdslider';
import {MdSubheader} from '../cyph/ui/components/material/mdsubheader';
import {MdTabs} from '../cyph/ui/components/material/mdtabs';
import {MdTextarea} from '../cyph/ui/components/material/mdtextarea';
import {MdToolbar} from '../cyph/ui/components/material/mdtoolbar';
import {Register} from '../cyph/ui/components/register';
import {elements} from '../cyph/ui/elements';
import {util} from '../cyph/util';
import {loaded} from '../preload';
import {AppComponent} from './appcomponent';
import {AppModule} from './appmodule';
import {UI} from './ui';


elements.body().attr(
	'ng-controller',
	config.angularConfig.rootController
);

angular.
	module(config.angularConfig.rootModule, ['ngMaterial']).
	controller(config.angularConfig.rootController, [
		'$mdDialog',
		'$mdSidenav',
		'$mdToast',

		(
			$mdDialog: angular.material.IDialogService,
			$mdSidenav: angular.material.ISidenavService,
			$mdToast: angular.material.IToastService
		) => eventManager.trigger(
			UI.uiInitEvent,
			{
				$mdDialog,
				$mdSidenav,
				$mdToast
			}
		)
	]).
	config(config.angularConfig.config).
	component(
		MdButton.title,
		MdButton.config
	).
	component(
		MdCard.title,
		MdCard.config
	).
	component(
		MdCardContent.title,
		MdCardContent.config
	).
	component(
		MdCardHeader.title,
		MdCardHeader.config
	).
	component(
		MdCardHeaderText.title,
		MdCardHeaderText.config
	).
	component(
		MdCardTitle.title,
		MdCardTitle.config
	).
	component(
		MdCardTitleText.title,
		MdCardTitleText.config
	).
	component(
		MdContent.title,
		MdContent.config
	).
	component(
		MdFabSpeedDial.title,
		MdFabSpeedDial.config
	).
	component(
		MdIcon.title,
		MdIcon.config
	).
	component(
		MdInput.title,
		MdInput.config
	).
	component(
		MdList.title,
		MdList.config
	).
	component(
		MdListItem.title,
		MdListItem.config
	).
	component(
		MdMenu.title,
		MdMenu.config
	).
	component(
		MdProgressCircular.title,
		MdProgressCircular.config
	).
	component(
		MdProgressLinear.title,
		MdProgressLinear.config
	).
	component(
		MdSelect.title,
		MdSelect.config
	).
	component(
		MdSidenav.title,
		MdSidenav.config
	).
	component(
		MdSlider.title,
		MdSlider.config
	).
	component(
		MdSubheader.title,
		MdSubheader.config
	).
	component(
		MdTabs.title,
		MdTabs.config
	).
	component(
		MdTextarea.title,
		MdTextarea.config
	).
	component(
		MdToolbar.title,
		MdToolbar.config
	).
	directive(
		'cyphFileInput',
		downgradeComponent({
			component: FileInput,
			inputs: ['accept'],
			outputs: ['change']
		})
	).
	directive(
		'cyphHelp',
		downgradeComponent({
			component: Help
		})
	).
	directive(
		'cyphRegister',
		downgradeComponent({
			component: Register,
			inputs: ['invite', 'signupForm']
		})
	).
	directive(
		'cyphApp',
		downgradeComponent({
			component: AppComponent
		})
	)
;


(async () => (
	<UpgradeModule>
	(
		await platformBrowser().bootstrapModule(AppModule)
	).injector.get(UpgradeModule)
).bootstrap(
	document.body,
	[config.angularConfig.rootModule]
))();


/* Redirect to Onion site when on Tor */

if (!env.isOnion) {
	(async () => {
		const response: string	= await util.request({
			discardErrors: true,
			url: `https://ping.${config.onionRoot}`
		});

		if (response === 'pong') {
			locationData.href	=
				'https://' +
				config.onionRoot +
				locationData.href.split(locationData.host + '/')[1]
			;
		}
	})();
}


export {loaded};
