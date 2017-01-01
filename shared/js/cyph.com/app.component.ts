import {Component} from '@angular/core';
import {Config, config} from '../cyph/config';
import {Env, env} from '../cyph/env';
import {DialogService} from '../cyph/ui/services/dialog.service';
import {EnvService} from '../cyph/ui/services/env.service';
import {MdSidenavService} from '../cyph/ui/services/material/md-sidenav.service';
import {NotificationService} from '../cyph/ui/services/notification.service';
import {SignupService} from '../cyph/ui/services/signup.service';
import {VirtualKeyboardWatcherService} from '../cyph/ui/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/ui/services/visibility-watcher.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';
import {DemoService} from './demo.service';
import {Promos, States} from './enums';


/**
 * Angular component for Cyph home page.
 */
@Component({
	providers: [
		DemoService,
		DialogService,
		EnvService,
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
	public sidenav: Promise<angular.material.ISidenavObject>;

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
				(await this.sidenav).close();
			}
		);
	}

	/** Opens mobile sidenav menu. */
	public async openSidenav () : Promise<void> {
		await util.sleep();
		(await this.sidenav).open();
	}

	constructor (
		mdSidenavService: MdSidenavService,

		/** @see AppService */
		public appService: AppService,

		/** @see DemoService */
		public demoService: DemoService,

		/** @see EnvService */
		public envService: EnvService
	) {
		this.sidenav	= mdSidenavService.getSidenav('main-toolbar-sidenav');
	}
}
