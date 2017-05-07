import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {Router} from '@angular/router';
import * as $ from 'jquery';
import {AccountAuthService} from '../cyph/services/account-auth.service';
import {AccountService} from '../cyph/services/account.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {util} from '../cyph/util';
import {ChatRootStates} from './enums';


/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService {
	/** @see ChatRootStates */
	public chatRootState: ChatRootStates	= ChatRootStates.blank;

	/** If true, app is locked down. */
	public isLockedDown: boolean			= !!customBuildPassword;

	constructor (
		accountAuthService: AccountAuthService,

		routerService: Router,

		faviconService: FaviconService,

		titleService: Title,

		/** @ignore */
		private readonly accountService: AccountService
	) {
		titleService.setTitle(util.translate(titleService.getTitle()));

		self.onhashchange	= () => { location.reload(); };

		(async () => {
			const urlSegmentPaths	=
				(
					await (
						await util.waitForValue(() =>
							routerService.routerState.root.firstChild || undefined
						)
					).url.first().toPromise()
				).map(o => o.path)
			;

			let loadingAccounts	= urlSegmentPaths[0] === 'account';

			/* Handle accounts special cases */
			if (urlSegmentPaths[0] === 'extension') {
				loadingAccounts						= true;
				this.accountService.isExtension		= true;

				routerService.navigate(['account', 'contacts']);
			}
			else if (urlSegmentPaths[0] === 'telehealth') {
				loadingAccounts						= true;
				this.accountService.isTelehealth	= true;

				$(document.body).addClass('telehealth');
				faviconService.setFavicon('telehealth');
				routerService.navigate(['account']);
			}

			if (this.isLockedDown) {
				await util.sleep(1000);
			}
			else if (loadingAccounts) {
				$(document.body).addClass('loading-accounts');
				await accountAuthService.ready;
			}
			else {
				while (this.chatRootState === ChatRootStates.blank) {
					await util.sleep();
				}

				await util.sleep();
			}

			$(document.body).addClass('load-complete');
		})();
	}
}
