import {Component} from '@angular/core';
import {Env, env} from '../cyph/env';
import {eventManager} from '../cyph/eventmanager';
import {Strings, strings} from '../cyph/strings';
import {DialogManager} from '../cyph/ui/dialogmanager';
import {Notifier} from '../cyph/ui/notifier';
import {States} from './enums';
import {UI} from './ui';


/**
 * Angular component for Cyph UI.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.im.html'
})
export class AppComponent {
	/** @ignore */
	private static uiInit	= eventManager.one<{
		$mdDialog: ng.material.IDialogService;
		$mdToast: ng.material.IToastService;
	}>(
		UI.uiInitEvent
	);


	/** @ignore */
	public ui: UI;

	/** @ignore */
	public env: Env					= env;

	/** @ignore */
	public states: typeof States	= States;

	/** @ignore */
	public strings: Strings			= strings;

	constructor () { (async () => {
		const o	= await AppComponent.uiInit;

		this.ui	= new UI(
			new DialogManager(o.$mdDialog, o.$mdToast),
			new Notifier()
		);

		/* For testing and debugging */
		if (env.isWeb) {
			(<any> self).ui	= this.ui;
		}
	})(); }
}
