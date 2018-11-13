import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router} from '@angular/router';
import {BaseProvider} from '../base-provider';
import {AccountAuthService} from './crypto/account-auth.service';
import {AccountDatabaseService} from './crypto/account-database.service';


/** Auth guard for accounts routing. */
@Injectable()
export class AccountAuthGuardService
extends BaseProvider
implements CanActivate, CanActivateChild {
	/** @ignore */
	private readonly anonymouslyAccessibleRoutes: string[]	= [
		'404',
		'logout',
		'profile',
		'register',
		'reject',
		'upload-ehr-credentials'
	];

	/** @ignore */
	private readonly pseudoAccountRoutes: string[]			= [
		'accept'
	];

	/** @ignore */
	private getFullRoutePath (route: ActivatedRouteSnapshot) : string[] {
		return route.url.map(o => o.path).concat(
			route.children.
				map(child => this.getFullRoutePath(child)).
				reduce((a, b) => a.concat(b), [])
		);
	}

	/** @inheritDoc */
	public async canActivate (route: ActivatedRouteSnapshot) : Promise<boolean> {
		if (
			this.accountDatabaseService.currentUser.value !== undefined ||
			(
				route.url.length > 0 &&
				this.anonymouslyAccessibleRoutes.indexOf(route.url[0].path) > -1 &&
				!(await this.accountAuthService.hasSavedCredentials())
			)
		) {
			return true;
		}

		if (this.pseudoAccountRoutes.indexOf(route.url[0].path) > -1) {
			this.accountAuthService.pseudoAccountLogin.next(true);
		}

		this.router.navigate([accountRoot, 'login'].concat(
			route.url.length > 0 ?
				(accountRoot ? [accountRoot] : []).concat(this.getFullRoutePath(route)) :
				[]
		));

		return false;
	}

	/** @inheritDoc */
	public async canActivateChild (route: ActivatedRouteSnapshot) : Promise<boolean> {
		return this.canActivate(route);
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {
		super();
	}
}
