import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {User} from '../account';
import {BaseProvider} from '../base-provider';
import {AccountUserTypes} from '../proto';
import {filterUndefined} from '../util/filter/base';
import {toBehaviorSubject} from '../util/flatten-observable';
import {normalize} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {AccountUserLookupService} from './account-user-lookup.service';

/**
 * Angular service for account organizations.
 */
@Injectable()
export class AccountOrganizationsService extends BaseProvider {
	/** @ignore */
	private readonly membersCache: Map<string, Observable<User[]>> = new Map();

	/** Gets members of organization. */
	public getMembers (org: string | User) : Observable<User[]> {
		return getOrSetDefault(
			this.membersCache,
			typeof org === 'string' ? normalize(org) : org.username,
			() =>
				toBehaviorSubject<User[]>(
					async () => {
						if (typeof org === 'string') {
							const maybeOrg = await this.accountUserLookupService.getUser(
								org
							);
							if (!maybeOrg) {
								return [];
							}
							org = maybeOrg;
						}

						if (
							(await org.accountUserProfile.getValue())
								.userType !== AccountUserTypes.Org
						) {
							return [];
						}

						return org.organizationMembers
							.watch()
							.pipe(
								switchMap(async o =>
									filterUndefined(
										await Promise.all(
											Object.keys(o).map(async username =>
												this.accountUserLookupService.getUser(
													username
												)
											)
										)
									)
								)
							);
					},
					[],
					this.subscriptions
				)
		);
	}

	/** Tries to to get organization User object for the specified user. */
	public async getOrganization (
		user: string | User
	) : Promise<User | undefined> {
		if (typeof user === 'string') {
			const maybeUser = await this.accountUserLookupService.getUser(user);
			if (!maybeUser) {
				return;
			}
			user = maybeUser;
		}

		const {organization} = await user.accountUserProfileExtra.getValue();

		if (!organization) {
			return;
		}

		const organizationUser = await this.accountUserLookupService.getUser(
			organization
		);

		if (
			!organizationUser ||
			!(await organizationUser.organizationMembers.getValue())[
				user.username
			]
		) {
			return;
		}

		return organizationUser;
	}

	constructor (
		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {
		super();
	}
}
