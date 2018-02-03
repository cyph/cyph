import {SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {IAsyncMap} from '../iasync-map';
import {IAsyncValue} from '../iasync-value';
import {
	AccountUserTypes,
	IAccountUserPresence,
	IAccountUserProfile,
	IAccountUserProfileExtra,
	IReview
} from '../proto';
import {cacheObservable} from '../util/flatten-observable-promise';
import {normalize} from '../util/formatting';
import {UserPresence} from './enums';
import {reviewMax} from './review-max';


/**
 * Represents a user profile.
 */
export class User {
	/** Image URI for avatar / profile picture. */
	public readonly avatar: Observable<SafeUrl|string|undefined>	=
		cacheObservable(
			this.avatarInternal.pipe(
				map(avatar => avatar || '/assets/img/favicon/favicon-256x256.png')
			),
			''
		)
	;

	/** Image URI for cover image. */
	public readonly coverImage: Observable<SafeUrl|string|undefined>	=
		cacheObservable(
			this.coverImageInternal.pipe(
				map(coverImage => coverImage || '/assets/img/walken.png')
			),
			''
		)
	;

	/** @see IAccountUserProfile.description */
	public readonly description: Observable<string>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({description}) => description)),
		''
	);

	/** @see IAccountUserProfile.externalUsernames */
	public readonly externalUsernames: Observable<{[k: string]: string}>	=
		cacheObservable(
			this.accountUserProfile.watch().pipe(
				map(({externalUsernames}) => externalUsernames || {})
			),
			{}
		)
	;

	/** @see IAccountUserProfileExtra */
	public readonly extra	= memoize(() => cacheObservable(
		this.accountUserProfileExtra.watch(),
		{}
	));

	/** @see IAccountUserProfile.hasPremium */
	public readonly hasPremium: Observable<boolean>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({hasPremium}) => hasPremium)),
		false
	);

	/** @see IAccountUserProfile.name */
	public readonly name: Observable<string>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({name}) => name)),
		''
	);

	/** Average rating. */
	public readonly rating	= memoize(() => cacheObservable(
		this.reviews.watch().pipe(map(reviews =>
			reviews.size < 1 ?
				0 :
				(
					Array.from(reviews.values()).
						map(review => Math.min(review.rating, reviewMax)).
						reduce((a, b) => a + b, 0)
				) / reviews.size
		)),
		0
	));

	/** Indicates whether user data is ready to be consumed. */
	public ready: boolean	= false;

	/** @see IAccountUserProfile.realUsername */
	public readonly realUsername: Observable<string>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({realUsername}) =>
			normalize(realUsername) === this.username ? realUsername : this.username
		)),
		''
	);

	/** @see IAccountUserProfile.status */
	public readonly status: Observable<UserPresence>	= cacheObservable(
		this.accountUserPresence.watch().pipe(map(({status}) => status)),
		UserPresence.Offline
	);

	/** @see IAccountUserProfile.userType */
	public readonly userType: Observable<AccountUserTypes>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({userType}) => userType)),
		AccountUserTypes.Standard
	);

	/** Fetches user data and sets ready to true when complete. */
	public async fetch () : Promise<void> {
		if (this.ready) {
			return;
		}

		await this.accountUserProfile.getValue();
		this.ready	= true;
	}

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
		public readonly accountUserProfile: IAsyncValue<IAccountUserProfile>,

		/** @see IAccountUserProfileExtra */
		public readonly accountUserProfileExtra: IAsyncValue<IAccountUserProfileExtra>,

		/** If applicable, usernames of members of this organization. */
		public readonly organizationMembers: IAsyncValue<{[username: string]: boolean}>,

		/** @see IReview */
		public readonly reviews: IAsyncMap<string, IReview>,

		/** Indicates whether we should immediately start fetching this user's data. */
		preFetch: boolean = false
	) {
		if (preFetch) {
			this.fetch();
		}
	}
}
