import {Injectable} from '@angular/core';
import {userPresenceSorted} from '../account/enums';
import {IUser} from '../account/iuser';
import {util} from '../util';


/**
 * @see Account user lookup service.
 */
@Injectable()
export class AccountUserLookupService {
	/** @ignore */
	public static DUMMY_USERS: IUser[]	= [

	].map((user: {
			avatar: string; email: string; hasPremium: boolean; name: string; username: string; }) => ({
		avatar: user.avatar,
		email: user.email,
		hasPremium: user.hasPremium,
		name: user.name,
		status: userPresenceSorted[util.random(userPresenceSorted.length)],
		username: user.username
	}));

	/** Tries to to get user object for the specified username. */
	public async getUser (username: string) : Promise<IUser> {
		const user	= AccountUserLookupService.DUMMY_USERS.find(o => o.username === username);

		if (user) {
			return user;
		}
		else {
			throw new Error(`User ${username} not found.`);
		}
	}

	constructor () {}
}
