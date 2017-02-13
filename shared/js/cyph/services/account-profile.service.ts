import {Injectable} from '@angular/core';
import {IUser} from '../account/iuser';
import {Profile} from '../account/profile';
import {util} from '../util';
import {AccountAuthService} from './account-auth.service';


/**
 * @see Account profile service.
 */
@Injectable()
export class AccountProfileService {
	public async getProfile (
		user: IUser|undefined = this.accountAuthService.user
	) : Promise<Profile> {
		if (!user) {
			return new Profile();
		}

		const externalUsernames	= ['facebook', 'keybase', 'reddit', 'twitter'].
			sort(() => util.random() > 0.5 ? -1 : 1).
			slice(0, util.random(5)).
			map(service => ({service, username: user.username}))
		;

		if (user === this.accountAuthService.user) {
			return new Profile(
				'/img/cyphphoto.jpg',
				'I am you.',
				externalUsernames
			);
		}

		return new Profile(
			'/img/metaimage.png',
			`Hello, my name is ${user.name}.`,
			externalUsernames
		);
	}

	constructor (
		/** @ignore */
		private accountAuthService: AccountAuthService
	) {}
}
