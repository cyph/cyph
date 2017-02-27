/**
 * @file Entry point of cyph.com.
 */


import '../preload';

import {enableProdMode} from '@angular/core';
import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as angular from 'angular';
import 'angular-material';
import * as $ from 'jquery';
import 'jquery.appear';
import 'magnific-popup';
import 'nanoscroller';
import 'whatwg-fetch';
import 'zone.js';
import {BetaRegisterComponent} from '../cyph/components/beta-register.component';
import {FileInputComponent} from '../cyph/components/file-input.component';
import {HelpComponent} from '../cyph/components/help.component';
import {MdButtonComponent} from '../cyph/components/material/md-button.component';
import {MdCardContentComponent} from '../cyph/components/material/md-card-content.component';
import {
	MdCardHeaderTextComponent
} from '../cyph/components/material/md-card-header-text.component';
import {MdCardHeaderComponent} from '../cyph/components/material/md-card-header.component';
import {
	MdCardTitleTextComponent
} from '../cyph/components/material/md-card-title-text.component';
import {MdCardTitleComponent} from '../cyph/components/material/md-card-title.component';
import {MdCardComponent} from '../cyph/components/material/md-card.component';
import {MdContentComponent} from '../cyph/components/material/md-content.component';
import {MdFabSpeedDialComponent} from '../cyph/components/material/md-fab-speed-dial.component';
import {MdIconComponent} from '../cyph/components/material/md-icon.component';
import {MdInputComponent} from '../cyph/components/material/md-input.component';
import {MdListItemComponent} from '../cyph/components/material/md-list-item.component';
import {MdListComponent} from '../cyph/components/material/md-list.component';
import {MdMenuComponent} from '../cyph/components/material/md-menu.component';
import {
	MdProgressCircularComponent
} from '../cyph/components/material/md-progress-circular.component';
import {
	MdProgressLinearComponent
} from '../cyph/components/material/md-progress-linear.component';
import {MdSelectComponent} from '../cyph/components/material/md-select.component';
import {MdSidenavComponent} from '../cyph/components/material/md-sidenav.component';
import {MdSliderComponent} from '../cyph/components/material/md-slider.component';
import {MdSubheaderComponent} from '../cyph/components/material/md-subheader.component';
import {MdTabsComponent} from '../cyph/components/material/md-tabs.component';
import {MdTextareaComponent} from '../cyph/components/material/md-textarea.component';
import {MdToolbarComponent} from '../cyph/components/material/md-toolbar.component';
import {config} from '../cyph/config';
import {env} from '../cyph/env';
import '../cyph/errors';
import {eventManager} from '../cyph/event-manager';
import {util} from '../cyph/util';
import '../translations';
import {AppComponent} from './app.component';
import {AppModule} from './app.module';


$(document.body).attr(
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
		) => {
			eventManager.trigger('$mdDialog', $mdDialog);
			eventManager.trigger('$mdSidenav', $mdSidenav);
			eventManager.trigger('$mdToast', $mdToast);
		}
	]).
	config(config.angularConfig.config).
	component(
		MdButtonComponent.title,
		MdButtonComponent.config
	).
	component(
		MdCardComponent.title,
		MdCardComponent.config
	).
	component(
		MdCardContentComponent.title,
		MdCardContentComponent.config
	).
	component(
		MdCardHeaderComponent.title,
		MdCardHeaderComponent.config
	).
	component(
		MdCardHeaderTextComponent.title,
		MdCardHeaderTextComponent.config
	).
	component(
		MdCardTitleComponent.title,
		MdCardTitleComponent.config
	).
	component(
		MdCardTitleTextComponent.title,
		MdCardTitleTextComponent.config
	).
	component(
		MdContentComponent.title,
		MdContentComponent.config
	).
	component(
		MdFabSpeedDialComponent.title,
		MdFabSpeedDialComponent.config
	).
	component(
		MdIconComponent.title,
		MdIconComponent.config
	).
	component(
		MdInputComponent.title,
		MdInputComponent.config
	).
	component(
		MdListComponent.title,
		MdListComponent.config
	).
	component(
		MdListItemComponent.title,
		MdListItemComponent.config
	).
	component(
		MdMenuComponent.title,
		MdMenuComponent.config
	).
	component(
		MdProgressCircularComponent.title,
		MdProgressCircularComponent.config
	).
	component(
		MdProgressLinearComponent.title,
		MdProgressLinearComponent.config
	).
	component(
		MdSelectComponent.title,
		MdSelectComponent.config
	).
	component(
		MdSidenavComponent.title,
		MdSidenavComponent.config
	).
	component(
		MdSliderComponent.title,
		MdSliderComponent.config
	).
	component(
		MdSubheaderComponent.title,
		MdSubheaderComponent.config
	).
	component(
		MdTabsComponent.title,
		MdTabsComponent.config
	).
	component(
		MdTextareaComponent.title,
		MdTextareaComponent.config
	).
	component(
		MdToolbarComponent.title,
		MdToolbarComponent.config
	).
	directive(
		'cyphBetaRegister',
		downgradeComponent({
			component: BetaRegisterComponent,
			inputs: ['invite', 'signupForm']
		})
	).
	directive(
		'cyphFileInput',
		downgradeComponent({
			component: FileInputComponent,
			inputs: ['accept'],
			outputs: ['change']
		})
	).
	directive(
		'cyphHelp',
		downgradeComponent({
			component: HelpComponent
		})
	).
	directive(
		'cyphApp',
		downgradeComponent({
			component: AppComponent
		})
	)
;


enableProdMode();

(async () => { (
	<UpgradeModule>
	(
		await platformBrowser().bootstrapModule(AppModule)
	).injector.get(UpgradeModule)
).bootstrap(
	document.body,
	[config.angularConfig.rootModule]
); })();


/* Redirect to Onion site when on Tor */

if (!env.isOnion) {
	(async () => {
		const response: string	= await util.request({
			url: `https://ping.${config.onionRoot}`
		}).catch(
			() => ''
		);

		if (response === 'pong') {
			locationData.href	=
				`https://${config.onionRoot}/` +
				locationData.href.split(locationData.host + '/')[1]
			;
		}
	})();
}
