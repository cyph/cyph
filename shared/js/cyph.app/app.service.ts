import {Injectable, NgZone} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {
	ActivatedRouteSnapshot,
	CanActivate,
	Router,
	RouterStateSnapshot
} from '@angular/router';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import {filter, first, take} from 'rxjs/operators';
import {BaseProvider} from '../cyph/base-provider';
import {config} from '../cyph/config';
import {AccountService} from '../cyph/services/account.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {EnvService} from '../cyph/services/env.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {translate} from '../cyph/util/translate';
import {resolvable, sleep, waitForValue} from '../cyph/util/wait';
import {ChatRootStates} from './enums';


/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService extends BaseProvider implements CanActivate {
	/** @ignore */
	private readonly _LOCKED_DOWN_ROUTE					= resolvable<string>();

	/** @ignore */
	private readonly lockedDownRoute: Promise<string>	= this._LOCKED_DOWN_ROUTE.promise;

	/** @see ChatRootStates */
	public readonly chatRootState	= new BehaviorSubject<ChatRootStates>(ChatRootStates.blank);

	/** If true, app is locked down. */
	public readonly isLockedDown	= new BehaviorSubject<boolean>(!(
		!(
			this.envService.environment.customBuild &&
			(
				this.envService.environment.customBuild.config.lockedDown ||
				this.envService.environment.customBuild.config.password
			)
		) ||
		[
			'confirm',
			'signup'
		].indexOf(locationData.hash.slice(1).split('/')[0]) > -1 ||
		(locationData.hash.split('/').slice(-1)[0] || '').match(
			new RegExp(`[${config.readableIDCharacters.join('|')}]{${config.secretLength}}$`)
		)
	));

	/** Resolves route to redirect to after unlock. */
	public readonly resolveLockedDownRoute: (lockedDownRoute: string) => void	=
		this._LOCKED_DOWN_ROUTE.resolve
	;

	/** @inheritDoc */
	public canActivate (_: ActivatedRouteSnapshot, state: RouterStateSnapshot) : boolean {
		if (this.isLockedDown.value) {
			this.resolveLockedDownRoute(state.url);
			return false;
		}

		return true;
	}

	/** Marks load as complete. */
	public async loadComplete () : Promise<void> {
		$(document.body).addClass('load-complete');
		await sleep(5000);
		$('#pre-load').remove();
	}

	/** Disables lockdown. */
	public async unlock () : Promise<void> {
		if (!this.isLockedDown.value) {
			return;
		}

		this.isLockedDown.next(false);
		this.router.navigateByUrl(`${burnerRoot}/${await this.lockedDownRoute}`);
	}

	constructor (
		ngZone: NgZone,

		faviconService: FaviconService,

		potassiumService: PotassiumService,

		titleService: Title,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();

		try {
			(<any> navigator).storage.persist();
		}
		catch {}

		titleService.setTitle(translate(titleService.getTitle()));

		if (this.envService.telehealthTheme) {
			faviconService.setFavicon('telehealth');
		}

		self.addEventListener('hashchange', e => {
			if (e.oldURL.split(location.origin)[1].match(
				new RegExp(`^/?#?/?${burnerRoot}(/|$)`)
			)) {
				location.reload();
			}
		});

		ngZone.runOutsideAngular(async () => {
			/* Redirect clients that cannot support native crypto when required */
			if (
				(await potassiumService.native()) &&
				!(await potassiumService.isNativeCryptoSupported())
			) {
				location.pathname	= '/unsupportedbrowser';
				return;
			}

			if (this.isLockedDown.value) {
				this.loadComplete();
			}

			await (
				await waitForValue(() =>
					router.routerState.root.firstChild || undefined
				)
			).url.pipe(first()).toPromise();

			const urlSegmentPaths	= router.url.split('/');

			if (this.envService.isExtension) {
				router.navigate(['contacts']);
			}

			if (burnerRoot !== '' && urlSegmentPaths[0] !== burnerRoot) {
				await this.accountService.uiReady;
			}
			else {
				await this.chatRootState.pipe(
					filter(state => state !== ChatRootStates.blank),
					take(1)
				).toPromise();

				await sleep();
			}

			await this.loadComplete();
		});
	}
}
