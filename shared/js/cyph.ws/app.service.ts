import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {
	ActivatedRouteSnapshot,
	CanActivate,
	Router,
	RouterStateSnapshot
} from '@angular/router';
import * as $ from 'jquery';
import {first} from 'rxjs/operators/first';
import {config} from '../cyph/config';
import {AccountService} from '../cyph/services/account.service';
import {AccountAuthService} from '../cyph/services/crypto/account-auth.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {sleep, translate, waitForValue} from '../cyph/util';
import {ChatRootStates} from './enums';


/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService implements CanActivate {
	/** @ignore */
	private readonly lockedDownRoute: Promise<string>	= new Promise<string>(resolve => {
		this.resolveLockedDownRoute	= resolve;
	});

	/** @ignore */
	private resolveLockedDownRoute: (lockedDownRoute: string) => void;

	/** @see ChatRootStates */
	public chatRootState: ChatRootStates	= ChatRootStates.blank;

	/** If true, app is locked down. */
	public isLockedDown: boolean			=
		!!customBuildPassword &&
		!locationData.hash.match(
			new RegExp(`[${config.readableIDCharacters.join('|')}]{${config.secretLength}}$`)
		)
	;

	/** @ignore */
	private loadComplete () : void {
		$(document.body).addClass('load-complete');
	}

	/** @inheritDoc */
	public canActivate (_: ActivatedRouteSnapshot, state: RouterStateSnapshot) : boolean {
		if (this.isLockedDown) {
			this.resolveLockedDownRoute(state.url);
			return false;
		}
		else {
			return true;
		}
	}

	/** Disables lockdown. */
	public async unlock () : Promise<void> {
		if (!this.isLockedDown) {
			return;
		}

		this.isLockedDown	= false;
		this.routerService.navigateByUrl(await this.lockedDownRoute);
	}

	constructor (
		accountAuthService: AccountAuthService,

		faviconService: FaviconService,

		titleService: Title,

		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly accountService: AccountService
	) {
		try {
			(<any> navigator).storage.persist();
		}
		catch (_) {}

		titleService.setTitle(translate(titleService.getTitle()));

		self.onhashchange	= () => {
			if (!locationData.hash.match(/^#?\/?account(\/|$)/)) {
				location.reload();
			}
		};

		(async () => {
			if (this.isLockedDown) {
				this.loadComplete();
			}

			await (
				await waitForValue(() =>
					routerService.routerState.root.firstChild || undefined
				)
			).url.pipe(first()).toPromise();

			const urlSegmentPaths	= routerService.url.split('/').slice(1);
			let loadingAccounts		= urlSegmentPaths[0] === 'account';

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
				routerService.navigate(['account'].concat(urlSegmentPaths.slice(1)));
			}

			if (loadingAccounts) {
				$(document.body).addClass('loading-accounts');
				await accountAuthService.ready;
			}
			else {
				while (this.chatRootState === ChatRootStates.blank) {
					await sleep();
				}

				await sleep();
			}

			this.loadComplete();
		})();
	}
}
