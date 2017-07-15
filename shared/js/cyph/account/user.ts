import {SafeUrl} from '@angular/platform-browser';
import {Observable} from 'rxjs';
import {IAccountUserPresence, IAccountUserProfile} from '../../proto';
import {IAsyncValue} from '../iasync-value';
import {util} from '../util';
import {UserPresence} from './enums';


/**
 * Represents a user profile.
 */
export class User {
	/** @see IAccountUserProfile.description */
	public readonly description: Observable<string>	= util.flattenObservablePromise(
		this.accountUserProfile.watch().map(({description}) => description),
		''
	);

	/** @see IAccountUserProfile.externalUsernames */
	public readonly externalUsernames: Observable<{[k: string]: string}>	=
		util.flattenObservablePromise(
			this.accountUserProfile.watch().map(({externalUsernames}) => externalUsernames || {}),
			{}
		)
	;

	/** @see IAccountUserProfile.hasPremium */
	public readonly hasPremium: Observable<boolean>	= util.flattenObservablePromise(
		this.accountUserProfile.watch().map(({hasPremium}) => hasPremium),
		false
	);

	/** @see IAccountUserProfile.name */
	public readonly name: Observable<string>	= util.flattenObservablePromise(
		this.accountUserProfile.watch().map(({name}) => name),
		''
	);

	/** @see IAccountUserProfile.realUsername */
	public readonly realUsername: Observable<string>	= util.flattenObservablePromise(
		this.accountUserProfile.watch().map(({realUsername}) => realUsername),
		''
	);

	/** @see IAccountUserProfile.status */
	public readonly status: Observable<UserPresence>	= util.flattenObservablePromise(
		this.accountUserPresence.watch().map(({status}) => status),
		UserPresence.Offline
	);

	constructor (
		/** Username (all lowercase). */
		public readonly username: string,

		/** Image URI for avatar / profile picture. */
		public readonly avatar: Observable<SafeUrl|string>,

		/** Image URI for cover image. */
		public readonly coverImage: Observable<SafeUrl|string>,

		/** @see IAccountUserPresence */
		public readonly accountUserPresence: IAsyncValue<IAccountUserPresence>,

		/** @see IAccountUserProfile */
		public readonly accountUserProfile: IAsyncValue<IAccountUserProfile>
	) {}
}
