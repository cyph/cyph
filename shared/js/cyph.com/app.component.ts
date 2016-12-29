import {Component} from '@angular/core';
import * as angular from 'angular';
import {Config, config} from '../cyph/config';
import {Env, env} from '../cyph/env';
import {eventManager} from '../cyph/event-manager';
import {DialogManager} from '../cyph/ui/dialog-manager';
import {util} from '../cyph/util';
import {Promos, States} from './enums';
import {UI} from './ui';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com/index.html'
})
export class AppComponent {
	/** @ignore */
	private static uiInit	= eventManager.one<{
		$mdDialog: angular.material.IDialogService;
		$mdSidenav: angular.material.ISidenavService;
		$mdToast: angular.material.IToastService;
	}>(
		UI.uiInitEvent
	);


	/** @ignore */
	private sidenavLock: {}	= {};

	/** @ignore */
	public sidenav: () => angular.material.ISidenavObject;

	/** @ignore */
	public ui: UI;

	/** @ignore */
	public config: Config			= config;

	/** @ignore */
	public env: Env					= env;

	/** @ignore */
	public promos: typeof Promos	= Promos;

	/** @ignore */
	public states: typeof States	= States;

	/** Closes mobile sidenav menu. */
	public async closeSidenav () : Promise<void> {
		return util.lockTryOnce(
			this.sidenavLock,
			async () => {
				await util.sleep();
				this.sidenav().close();
			}
		);
	}

	/** Opens mobile sidenav menu. */
	public async openSidenav () : Promise<void> {
		await util.sleep();
		this.sidenav().open();
	}

	constructor () { (async () => {
		const o	= await AppComponent.uiInit;

		this.sidenav	= () => o.$mdSidenav('main-toolbar-sidenav');
		this.ui			= new UI(new DialogManager(o.$mdDialog, o.$mdToast));

		/* For testing and debugging */
		if (env.isWeb) {
			(<any> self).ui	= this.ui;
		}
	})(); }
}
