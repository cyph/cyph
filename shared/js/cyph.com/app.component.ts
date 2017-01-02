import {Component} from '@angular/core';
import {ConfigService} from '../cyph/services/config.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {MdSidenavService} from '../cyph/services/material/md-sidenav.service';
import {NotificationService} from '../cyph/services/notification.service';
import {SignupService} from '../cyph/services/signup.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {VirtualKeyboardWatcherService} from '../cyph/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/services/visibility-watcher.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';
import {DemoService} from './demo.service';
import {SilentNotificationService} from './silent-notification.service';


/**
 * Angular component for Cyph home page.
 */
@Component({
	providers: [
		AppService,
		ConfigService,
		DemoService,
		DialogService,
		EnvService,
		SignupService,
		StringsService,
		UrlStateService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService,
		{
			provide: NotificationService,
			useClass: SilentNotificationService
		}
	],
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com/index.html'
})
export class AppComponent {
	/** @ignore */
	private sidenavLock: {}	= {};

	/** @ignore */
	private sidenav: Promise<angular.material.ISidenavObject>;

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
		public readonly appService: AppService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see DemoService */
		public readonly demoService: DemoService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {
		this.sidenav	= mdSidenavService.getSidenav('main-toolbar-sidenav');
	}
}
