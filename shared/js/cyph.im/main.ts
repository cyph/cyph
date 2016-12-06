/**
 * @file Entry point of cyph.im.
 */


/// <reference path="../preload/capabilities.ts" />
/// <reference path="../preload/unsupportedbrowsers.ts" />
/// <reference path="../preload/dompurify.ts" />
/// <reference path="../preload/jquery.ts" />

import {platformBrowser} from '@angular/platform-browser';
import {downgradeComponent, UpgradeModule} from '@angular/upgrade/static';
import * as Cyph from '../cyph';
import {loaded} from '../preload';
import {AppComponent} from './appcomponent';
import {AppModule} from './appmodule';
import {BetaStates, States, urlSections} from './enums';
import {UI} from './ui';


if (Cyph.Env.isEdge) {
	location.pathname	= '/unsupportedbrowser';
}


Cyph.UI.Elements.body().attr(
	'ng-controller',
	Cyph.Config.angularConfig.rootController
);

angular.
	module(Cyph.Config.angularConfig.rootModule, ['ngMaterial']).
	controller(Cyph.Config.angularConfig.rootController, [
		'$mdDialog',
		'$mdToast',

		($mdDialog, $mdToast) => {
			cyph	= Cyph;
			cyph.im	= {
				BetaStates,
				States,
				UI,
				urlSections
			};

			ui	= new UI(
				new Cyph.UI.DialogManager($mdDialog, $mdToast),
				new Cyph.UI.Notifier()
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
		Cyph.UI.Components.Material.MdFabSpeedDial.title,
		Cyph.UI.Components.Material.MdFabSpeedDial.config
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
		'cyphFileInput',
		downgradeComponent({
			component: Cyph.UI.Components.FileInput,
			inputs: ['accept'],
			outputs: ['change']
		})
	).
	directive(
		'cyphHelp',
		downgradeComponent({
			component: Cyph.UI.Components.Help
		})
	).
	directive(
		'cyphRegister',
		downgradeComponent({
			component: Cyph.UI.Components.Register,
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
	[Cyph.Config.angularConfig.rootModule]
))();


export {loaded};
