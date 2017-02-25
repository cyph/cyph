import {Component, Input, OnInit} from '@angular/core';
import {Profile} from '../account/profile';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountProfileService} from '../services/account-profile.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
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
export class AccountMenuComponent implements OnInit {
	/** @ignore */
	public menuLock: boolean	= true;

	/** Username of profile owner. */
	@Input() public username: string|undefined;

	/** User profile. */
	public profile: Profile|undefined;

	/** @ignore */
	public menu: Promise<angular.material.ISidenavObject>;

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

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.openMenu();
		try {
			this.profile	= await this.accountProfileService.getProfile(
				this.username ?
					await this.accountUserLookupService.getUser(this.username) :
					undefined
			);
		}
		catch (_) {
		}
	}
	constructor (
		mdSidenavService: MdSidenavService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountProfileService: AccountProfileService,

		/** @see AccountContactsService */
		public readonly accountUserLookupService: AccountUserLookupService
	) {
		this.menu	= mdSidenavService.getSidenav('menu');
	}
}
