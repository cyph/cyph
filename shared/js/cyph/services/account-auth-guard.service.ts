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
		'upload-ehr-credentials',
		'welcome'
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
				(accountRoot ? [accountRoot] : []).concat(this.getFullRoutePath(route)) :
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
