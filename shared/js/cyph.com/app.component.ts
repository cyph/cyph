import {Component, Inject} from '@angular/core';
import * as angular from 'angular';
import {Config, config} from '../cyph/config';
import {Env, env} from '../cyph/env';
import {DialogManager} from '../cyph/ui/dialog-manager';
import {DialogService} from '../cyph/ui/services/dialog.service';
import {NotificationService} from '../cyph/ui/services/notification.service';
import {SignupService} from '../cyph/ui/services/signup.service';
import {VirtualKeyboardWatcherService} from '../cyph/ui/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/ui/services/visibility-watcher.service';
import {util} from '../cyph/util';
import {Promos, States} from './enums';
import {UI} from './ui';


/**
 * Angular component for Cyph home page.
 */
@Component({
	providers: [
		DialogService,
		NotificationService,
		SignupService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService
	],
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com/index.html'
})
export class AppComponent {
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

	constructor (
		@Inject('MdDialogService') mdDialogService: angular.material.IDialogService,
		@Inject('MdSidenavService') mdSidenavService: angular.material.ISidenavService,
		@Inject('MdToastService') mdToastService: angular.material.IToastService
	) {
		this.sidenav	= () => mdSidenavService('main-toolbar-sidenav');
		this.ui			= new UI(new DialogManager(mdDialogService, mdToastService));

		/* For testing and debugging */
		if (env.isWeb) {
			(<any> self).ui	= this.ui;
		}
	}
}
