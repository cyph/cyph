import {Component} from '@angular/core';
import {Config, config} from '../cyph/config';
import {Env, env} from '../cyph/env';
import {eventManager} from '../cyph/eventmanager';
import {DialogManager} from '../cyph/ui/dialogmanager';
import {Promos, States} from './enums';
import {UI} from './ui';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com.html'
})
export class AppComponent {
	/** @ignore */
	private static uiInit	= eventManager.one<{
		$mdDialog: ng.material.IDialogService;
		$mdSidenav: ng.material.ISidenavService;
		$mdToast: ng.material.IToastService;
	}>(
		UI.uiInitEvent
	);


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

	constructor () { (async () => {
		const o	= await AppComponent.uiInit;

		this.ui	= new UI(
			() => o.$mdSidenav('main-toolbar-sidenav'),
			new DialogManager(o.$mdDialog, o.$mdToast)
		);

		/* For testing and debugging */
		if (env.isWeb) {
			(<any> self).ui	= this.ui;
		}
	})(); }
}
