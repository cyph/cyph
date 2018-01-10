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
import {translate} from '../cyph/util/translate';
import {sleep, waitForValue} from '../cyph/util/wait';
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
	private async loadComplete () : Promise<void> {
		$(document.body).addClass('load-complete');
		await sleep(5000);
		$('#pre-load').remove();
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
		this.router.navigateByUrl(await this.lockedDownRoute);
	}

	constructor (
		accountAuthService: AccountAuthService,

		faviconService: FaviconService,

		titleService: Title,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService
	) {
		try {
			(<any> navigator).storage.persist();
		}
		catch {}

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
					router.routerState.root.firstChild || undefined
				)
			).url.pipe(first()).toPromise();

			const urlSegmentPaths	= router.url.split('/');
			let loadingAccounts		= accountRoot === '' || urlSegmentPaths[0] === accountRoot;

			/* Handle accounts special cases */
			if (urlSegmentPaths[0] === 'extension') {
				loadingAccounts						= true;
				this.accountService.isExtension		= true;

				router.navigate([accountRoot, 'contacts']);
			}
			else if (urlSegmentPaths[0] === 'telehealth') {
				loadingAccounts						= true;
				this.accountService.isTelehealth	= true;

				$(document.body).addClass('telehealth');
				faviconService.setFavicon('telehealth');
				router.navigate([accountRoot].concat(urlSegmentPaths.slice(1)));
			}

			if (loadingAccounts) {
				await this.accountService.uiReady;
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
