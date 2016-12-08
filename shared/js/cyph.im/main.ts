/**
 * @file Entry point of cyph.im.
 */


/// <reference path="../preload/capabilities.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/dompurify.ts" />
/// <reference path="../preload/jquery.ts" />

import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import {config} from '../cyph/config';
import {env} from '../cyph/env';
import {eventManager} from '../cyph/eventmanager';
import {FileInput, Help, Register} from '../cyph/ui/components';
import {
	MdButton,
	MdCard,
	MdCardContent,
	MdCardHeader,
	MdCardHeaderText,
	MdCardTitle,
	MdCardTitleText,
	MdContent,
	MdFabSpeedDial,
	MdIcon,
	MdInput,
	MdList,
	MdListItem,
	MdMenu,
	MdOption,
	MdProgressCircular,
	MdProgressLinear,
	MdSelect,
	MdSidenav,
	MdSlider,
	MdSubheader,
	MdSwitch,
	MdTabs,
	MdTextarea,
	MdToolbar,
	MdTooltip
} from '../cyph/ui/components/material';
import {elements} from '../cyph/ui/elements';
import {loaded} from '../preload';
import {AppComponent} from './appcomponent';
import {AppModule} from './appmodule';
import {UI} from './ui';


if (env.isEdge) {
	location.pathname	= '/unsupportedbrowser';
}


elements.body().attr(
	'ng-controller',
	config.angularConfig.rootController
);

angular.
	module(config.angularConfig.rootModule, ['ngMaterial']).
	controller(config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',

		(
			$mdDialog: ng.material.IDialogService,
			$mdToast: ng.material.IToastService
		) => eventManager.trigger(
			UI.uiInitEvent,
			{
				$mdDialog,
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
		MdOption.title,
		MdOption.config
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
		MdSwitch.title,
		MdSwitch.config
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
	component(
		MdTooltip.title,
		MdTooltip.config
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


export {loaded};
