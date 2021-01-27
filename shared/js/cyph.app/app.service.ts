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
import {BooleanProto} from '../cyph/proto';
import {AccountService} from '../cyph/services/account.service';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {ConfigService} from '../cyph/services/config.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {translate} from '../cyph/util/translate';
import {resolvable, sleep, waitForValue} from '../cyph/util/wait';
import {reloadWindow} from '../cyph/util/window';
import {ChatRootStates} from './enums';

/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService extends BaseProvider implements CanActivate {
	/** @ignore */
	private readonly _LOCKED_DOWN_ROUTE = resolvable<string>();

	/** @ignore */
	private readonly lockedDownRoute: Promise<string> = this._LOCKED_DOWN_ROUTE;

	/** @see ChatRootStates */
	public readonly chatRootState = new BehaviorSubject<ChatRootStates>(
		ChatRootStates.blank
	);

	/** If true, app is locked down. */
	public readonly isLockedDown = new BehaviorSubject<boolean>(
		!(
			!(
				this.envService.environment.customBuild &&
				(this.envService.environment.customBuild.config.lockedDown ||
					this.envService.environment.customBuild.config.password)
			) ||
			['confirm', 'signup'].indexOf(
				locationData.hash.slice(1).split('/')[0]
			) > -1 ||
			locationData.hash
				.replace(/^#burner\//, '')
				.split('/')[0]
				.match(
					new RegExp(
						`[${config.readableIDCharacters.join('|')}]{${
							config.secretLength
						}}$`
					)
				)
		)
	);

	/** Resolves route to redirect to after unlock. */
	public readonly resolveLockedDownRoute: (
		lockedDownRoute: string
	) => void = this._LOCKED_DOWN_ROUTE.resolve;

	/** @inheritDoc */
	public canActivate (
		_: ActivatedRouteSnapshot,
		state: RouterStateSnapshot
	) : boolean {
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
		this.router.navigateByUrl(
			`${burnerRoot}/${await this.lockedDownRoute}`
		);
	}

	constructor (
		ngZone: NgZone,

		analyticsService: AnalyticsService,

		faviconService: FaviconService,

		localStorageService: LocalStorageService,

		potassiumService: PotassiumService,

		titleService: Title,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super();

		/* Temporary warning pending further investigation */
		if (this.envService.isEdge) {
			localStorageService
				.getOrSetDefault(
					'EdgeTemporaryInstabilityWarning',
					BooleanProto,
					async () =>
						this.dialogService
							.alert({
								content:
									'We are currently investigating user reports of problems with the latest Microsoft Edge. If you run into any issues, please try again in Chrome or Firefox.',
								title: 'Warning'
							})
							.then(() => true)
				)
				.catch(() => {});
		}

		try {
			(<any> navigator).storage.persist();
		}
		catch {}

		if (
			(<any> self).IonicDeeplink &&
			typeof (<any> self).IonicDeeplink.onDeepLink === 'function'
		) {
			(<any> self).IonicDeeplink.onDeepLink((data?: Record<any, any>) => {
				const url = data?.url;
				if (typeof url !== 'string') {
					return;
				}

				const host =
					typeof data?.host === 'string' && data.host.length > 0 ?
						data.host :
						url.replace(/^(.*?:\/\/)?(.*?)\/.*/, '$2');

				const route = url.replace(/^(.*?:\/\/)?.*?\/#?/, '').split('/');

				this.router.navigate([
					...(this.configService.webSignRedirects[host] || []),
					...route
				]);
			});
		}

		titleService.setTitle(translate(titleService.getTitle()));

		if (this.envService.telehealthTheme.value) {
			faviconService.setFavicon('telehealth');
		}

		self.addEventListener('hashchange', e => {
			if (
				e.oldURL
					.split(location.origin)[1]
					.match(new RegExp(`^/?#?/?${burnerRoot}(/|$)`)) ||
				e.oldURL
					.split(location.origin)[1]
					.match(/^\/?#?\/?account-burner(\/|$)/)
			) {
				reloadWindow();
			}
		});

		localStorageService
			.getString('username')
			.then(async username =>
				potassiumService.toHex(
					await potassiumService.hash.hash(username)
				)
			)
			.catch(() => undefined)
			.then(uid => {
				analyticsService.setUID(uid);
			});

		ngZone.runOutsideAngular(async () => {
			/* Redirect clients that cannot support native crypto when required */
			if (
				(await potassiumService.native()) &&
				!(await potassiumService.isNativeCryptoSupported())
			) {
				location.pathname = '/unsupportedbrowser';
				return;
			}

			if (this.isLockedDown.value) {
				this.loadComplete();
			}

			await (await waitForValue(
				() => router.routerState.root.firstChild || undefined
			)).url
				.pipe(first())
				.toPromise();

			const urlSegmentPaths = router.url.split('/');

			if (this.envService.isExtension) {
				router.navigate(['contacts']);
			}

			if (
				burnerRoot !== '' &&
				urlSegmentPaths[0] !== burnerRoot &&
				urlSegmentPaths[0] !== `${burnerRoot}-group-test` &&
				urlSegmentPaths[0] !== `${burnerRoot}-ui-test`
			) {
				await this.accountService.uiReady;
			}
			else {
				await this.chatRootState
					.pipe(
						filter(state => state !== ChatRootStates.blank),
						take(1)
					)
					.toPromise();

				await sleep();
			}

			await this.loadComplete();
		});
	}
}
