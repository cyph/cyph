import {SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {Observable} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {IAsyncMap} from '../iasync-map';
import {IAsyncValue} from '../iasync-value';
import {
	AccountUserTypes,
	IAccountUserPresence,
	IAccountUserProfile,
	IAccountUserProfileExtra,
	IReview
} from '../proto';
import {cacheObservable} from '../util/flatten-observable';
import {normalize} from '../util/formatting';
import {lockTryOnce} from '../util/lock';
import {staticDomSanitizer} from '../util/static-services';
import {UserPresence} from './enums';
import {reviewMax} from './review-max';


/**
 * Represents a user profile.
 */
export class User {
	/** @ignore */
	private static readonly defaultAvatar: Promise<SafeUrl>		=
		staticDomSanitizer.then(domSanitizer =>
			domSanitizer.bypassSecurityTrustUrl('/assets/img/favicon/favicon-256x256.png')
		)
	;

	/** @ignore */
	private static readonly defaultCoverImage: Promise<SafeUrl>	=
		staticDomSanitizer.then(domSanitizer =>
			domSanitizer.bypassSecurityTrustUrl('/assets/img/coverimage.png')
		)
	;


	/** @ignore */
	private readonly fetchLock: {}	= {};

	/** Image URI for avatar / profile picture. */
	public readonly avatar: Observable<SafeUrl|undefined>	= cacheObservable(
		this.avatarInternal.pipe(
			mergeMap(async avatar => avatar || User.defaultAvatar)
		),
		undefined
	);

	/** Image URI for cover image. */
	public readonly coverImage: Observable<SafeUrl|undefined>	= cacheObservable(
		this.coverImageInternal.pipe(
			mergeMap(async coverImage => coverImage || User.defaultCoverImage)
		),
		undefined
	);

	/** @see IAccountUserProfile.description */
	public readonly description: Observable<string>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({description}) => description)),
		''
	);

	/** @see IAccountUserProfile.externalUsernames */
	public readonly externalUsernames: Observable<{[k: string]: string}|undefined>	=
		cacheObservable(
			this.accountUserProfile.watch().pipe(
				map(({externalUsernames}) => externalUsernames || {})
			),
			undefined
		)
	;

	/** @see IAccountUserProfileExtra */
	public readonly extra: () => Observable<IAccountUserProfileExtra|undefined>	=
		memoize(() => cacheObservable(
			this.accountUserProfileExtra.watch(),
			undefined
		))
	;

	/** @see IAccountUserProfile.hasPremium */
	public readonly hasPremium: Observable<boolean|undefined>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({hasPremium}) => hasPremium)),
		undefined
	);

	/** @see IAccountUserProfile.name */
	public readonly name: Observable<string>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({name}) => name)),
		''
	);

	/** Average rating. */
	public readonly rating: () => Observable<number|undefined>	= memoize(() => cacheObservable(
		this.reviews.watch().pipe(map(reviews =>
			reviews.size < 1 ?
				undefined :
				(
					Array.from(reviews.values()).
						map(review => Math.min(review.rating, reviewMax)).
						reduce((a, b) => a + b, 0)
				) / reviews.size
		)),
		undefined
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
	public readonly userType: Observable<AccountUserTypes|undefined>	= cacheObservable(
		this.accountUserProfile.watch().pipe(map(({userType}) => userType)),
		undefined
	);

	/** Fetches user data and sets ready to true when complete. */
	public async fetch () : Promise<void> {
		if (this.ready) {
			return;
		}

		await lockTryOnce(this.fetchLock, async () => {
			await this.accountUserProfile.getValue();
			this.ready	= true;
		});
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
