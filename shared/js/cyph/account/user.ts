import {SafeUrl} from '@angular/platform-browser';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {IAccountUserPresence, IAccountUserProfile} from '../../proto';
import {IAsyncValue} from '../iasync-value';
import {flattenObservablePromise, normalize} from '../util';
import {UserPresence} from './enums';


/**
 * Represents a user profile.
 */
export class User {
	/** Image URI for avatar / profile picture. */
	public readonly avatar: Observable<SafeUrl|string|undefined>	=
		flattenObservablePromise(
			this.avatarInternal.pipe(
				map(avatar => avatar || '/assets/img/favicon/favicon-256x256.png')
			),
			''
		)
	;

	/** Image URI for cover image. */
	public readonly coverImage: Observable<SafeUrl|string|undefined>	=
		flattenObservablePromise(
			this.coverImageInternal.pipe(
				map(coverImage => coverImage || '/assets/img/walken.png')
			),
			''
		)
	;

	/** @see IAccountUserProfile.description */
	public readonly description: Observable<string>	= flattenObservablePromise(
		this.accountUserProfile.watch().pipe(map(({description}) => description)),
		''
	);

	/** @see IAccountUserProfile.externalUsernames */
	public readonly externalUsernames: Observable<{[k: string]: string}>	=
		flattenObservablePromise(
			this.accountUserProfile.watch().pipe(
				map(({externalUsernames}) => externalUsernames || {})
			),
			{}
		)
	;

	/** @see IAccountUserProfile.hasPremium */
	public readonly hasPremium: Observable<boolean>	= flattenObservablePromise(
		this.accountUserProfile.watch().pipe(map(({hasPremium}) => hasPremium)),
		false
	);

	/** @see IAccountUserProfile.name */
	public readonly name: Observable<string>	= flattenObservablePromise(
		this.accountUserProfile.watch().pipe(map(({name}) => name)),
		''
	);

	/** @see IAccountUserProfile.realUsername */
	public readonly realUsername: Observable<string>	= flattenObservablePromise(
		this.accountUserProfile.watch().pipe(map(({realUsername}) =>
			normalize(realUsername) === this.username ? realUsername : this.username
		)),
		''
	);

	/** @see IAccountUserProfile.status */
	public readonly status: Observable<UserPresence>	= flattenObservablePromise(
		this.accountUserPresence.watch().pipe(map(({status}) => status)),
		UserPresence.Offline
	);

	constructor (
		/** Username (all lowercase). */
		public readonly username: string,

		/** @ignore */
		private readonly avatarInternal: Observable<SafeUrl|string|undefined>,

		/** @ignore */
		private readonly coverImageInternal: Observable<SafeUrl|string|undefined>,

		/** @see IAccountUserPresence */
		public readonly accountUserPresence: IAsyncValue<IAccountUserPresence>,

		/** @see IAccountUserProfile */
		public readonly accountUserProfile: IAsyncValue<IAccountUserProfile>
	) {}
}
