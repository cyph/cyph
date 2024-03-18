import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router} from '@angular/router';
import {BaseProvider} from '../base-provider';
import {AccountAuthService} from './crypto/account-auth.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {EnvService} from './env.service';
import {StringsService} from './strings.service';

/** Auth guard for accounts routing. */
@Injectable()
export class AccountAuthGuardService extends BaseProvider {
	/** @ignore */
	private readonly anonymouslyAccessibleRoutes: string[] = [
		'404',
		'cancel-email',
		'compose',
		'download',
		'email',
		'email-compose-test',
		'email-view-test',
		'post',
		'profile',
		'reject',
		'request-appointment',
		'upload-ehr-credentials',
		'warrant-canary'
	];

	/** @ignore */
	private readonly forcedAnonymouslyAccessibleRoutes: string[] = [
		'register',
		'registerv1'
	];

	/** @ignore */
	private readonly pseudoAccountRoutes: string[] = ['accept'];

	/** @ignore */
	private getFullRoutePath (route: ActivatedRouteSnapshot) : string[] {
		return route.pathFromRoot.flatMap(o => o.url).map(o => o.path);
	}

	/** @inheritDoc */
	public async canActivate (
		route: ActivatedRouteSnapshot
	) : Promise<boolean> {
		if (
			beforeUnloadMessage &&
			this.envService.isWeb &&
			!confirm(
				`${beforeUnloadMessage} ${this.stringsService.continuePrompt}`
			)
		) {
			return false;
		}

		if (
			this.accountDatabaseService.currentUser.value !== undefined ||
			(route.url.length > 0 &&
				(this.forcedAnonymouslyAccessibleRoutes.indexOf(
					route.url[0].path
				) > -1 ||
					(this.anonymouslyAccessibleRoutes.indexOf(
						route.url[0].path
					) > -1 &&
						!(await this.accountAuthService.hasSavedCredentials()))))
		) {
			return true;
		}

		if (
			route.url.length > 0 &&
			this.pseudoAccountRoutes.indexOf(route.url[0].path) > -1
		) {
			this.accountAuthService.pseudoAccountLogin.next(true);
		}

		this.router.navigate([
			'login',
			...(route.url.length > 0 ? this.getFullRoutePath(route) : [])
		]);

		return false;
	}

	/** @inheritDoc */
	public async canActivateChild (
		route: ActivatedRouteSnapshot
	) : Promise<boolean> {
		return this.canActivate(route);
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
