import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router} from '@angular/router';
import {AccountDatabaseService} from '../services/crypto/account-database.service';


/** Auth guard for accounts routing. */
@Injectable()
export class AccountAuthGuardService implements CanActivate, CanActivateChild {
	/** @ignore */
	private readonly anonymouslyAccessibleRoutes: string[]	= [
		'404',
		'logout',
		'profile',
		'register',
		'welcome'
	];

	/** @inheritDoc */
	public canActivate (route: ActivatedRouteSnapshot) : boolean {
		if (
			this.accountDatabaseService.currentUser.value !== undefined ||
			(
				route.url.length > 0 &&
				this.anonymouslyAccessibleRoutes.indexOf(route.url[0].path) > -1
			)
		) {
			return true;
		}

		this.router.navigate([accountRoot, 'login'].concat(
			route.url.length > 0 ?
				(accountRoot ? [accountRoot] : []).concat(route.url.map(o => o.path)) :
				[]
		));

		return false;
	}

	/** @inheritDoc */
	public canActivateChild (route: ActivatedRouteSnapshot) : boolean {
		return this.canActivate(route);
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService
	) {}
}
