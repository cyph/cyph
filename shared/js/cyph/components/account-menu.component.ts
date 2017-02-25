import {Component} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
import {MdSidenavService} from '../services/material/md-sidenav.service';
import {util} from '../util';




/**
 * Angular component for account home UI.
 */
@Component({
	selector: 'cyph-account-menu',
	styleUrls: ['../../css/components/account-menu.css'],
	templateUrl: '../../../templates/account-menu.html'
})
export class AccountMenuComponent {
	/** @ignore */
	public menuLock: boolean	= true;

	/** @ignore */
	private menu: Promise<angular.material.ISidenavObject>;

	/** Closes account menu */
	public async closeMenu () : Promise<void> {
		return util.lockTryOnce(
			this.menuLock,
			async () => {
				await util.sleep();
				(await this.menu).close();
			}
		);
	}

	/** Opens account menu */
	public async openMenu () : Promise<void> {
		await util.sleep();
		(await this.menu).open();
	}

	public ngOnInit () : void {
		this.openMenu();
	}
	constructor (
		mdSidenavService: MdSidenavService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountProfileService: AccountProfileService
	) {
		this.menu	= mdSidenavService.getSidenav('menu');
	}
}
