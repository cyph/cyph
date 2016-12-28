/**
 * @file Entry point of cyph.com.
 */


import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as angular from 'angular';
import {config} from '../cyph/config';
import {env} from '../cyph/env';
import {eventManager} from '../cyph/event-manager';
import {FileInputComponent} from '../cyph/ui/components/fileinput.component';
import {HelpComponent} from '../cyph/ui/components/help.component';
import {MdButtonComponent} from '../cyph/ui/components/material/mdbutton.component';
import {MdCardComponent} from '../cyph/ui/components/material/mdcard.component';
import {MdCardContentComponent} from '../cyph/ui/components/material/mdcardcontent.component';
import {MdCardHeaderComponent} from '../cyph/ui/components/material/mdcardheader.component';
import {
	MdCardHeaderTextComponent
} from '../cyph/ui/components/material/mdcardheadertext.component';
import {MdCardTitleComponent} from '../cyph/ui/components/material/mdcardtitle.component';
import {MdCardTitleTextComponent} from '../cyph/ui/components/material/mdcardtitletext.component';
import {MdContentComponent} from '../cyph/ui/components/material/mdcontent.component';
import {MdFabSpeedDialComponent} from '../cyph/ui/components/material/mdfabspeeddial.component';
import {MdIconComponent} from '../cyph/ui/components/material/mdicon.component';
import {MdInputComponent} from '../cyph/ui/components/material/mdinput.component';
import {MdListComponent} from '../cyph/ui/components/material/mdlist.component';
import {MdListItemComponent} from '../cyph/ui/components/material/mdlistitem.component';
import {MdMenuComponent} from '../cyph/ui/components/material/mdmenu.component';
import {
	MdProgressCircularComponent
} from '../cyph/ui/components/material/mdprogresscircular.component';
import {
	MdProgressLinearComponent
} from '../cyph/ui/components/material/mdprogresslinear.component';
import {MdSelectComponent} from '../cyph/ui/components/material/mdselect.component';
import {MdSidenavComponent} from '../cyph/ui/components/material/mdsidenav.component';
import {MdSliderComponent} from '../cyph/ui/components/material/mdslider.component';
import {MdSubheaderComponent} from '../cyph/ui/components/material/mdsubheader.component';
import {MdTabsComponent} from '../cyph/ui/components/material/mdtabs.component';
import {MdTextareaComponent} from '../cyph/ui/components/material/mdtextarea.component';
import {MdToolbarComponent} from '../cyph/ui/components/material/mdtoolbar.component';
import {RegisterComponent} from '../cyph/ui/components/register.component';
import {elements} from '../cyph/ui/elements';
import {util} from '../cyph/util';
import {loaded} from '../preload';
import {AppComponent} from './app.component';
import {AppModule} from './app.module';
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
		) => { eventManager.trigger(
			UI.uiInitEvent,
			{
				$mdDialog,
				$mdSidenav,
				$mdToast
			}
		); }
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
		'cyphRegister',
		downgradeComponent({
			component: RegisterComponent,
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
				'https://' +
				config.onionRoot +
				locationData.href.split(locationData.host + '/')[1]
			;
		}
	})();
}


export {loaded};
