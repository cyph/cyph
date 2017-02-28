import {Component} from '@angular/core';
import {ConfigService} from '../cyph/services/config.service';
import {EnvService} from '../cyph/services/env.service';
import {MdSidenavService} from '../cyph/services/material/md-sidenav.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';
import {DemoService} from './demo.service';


/**
 * Angular component for Cyph home page.
 */
@Component({
	providers: [
		AppService,
		DemoService
	],
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com/index.html'
})
export class AppComponent {
	/** @ignore */
	private sidenav: Promise<angular.material.ISidenavObject>;

	/** @ignore */
	private sidenavLock: {}	= {};

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
