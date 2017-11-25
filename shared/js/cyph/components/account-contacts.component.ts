import {Component, Input} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {take} from 'rxjs/operators/take';
import {User, UserPresence} from '../account';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {compareArrays} from '../util/compare';
import {filterUndefined} from '../util/filter';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../../css/components/account-contacts.scss'],
	templateUrl: '../../../templates/account-contacts.html'
})
export class AccountContactsComponent {
	private userCache: {usernames: string[]; users: User[]}	= {usernames: [], users: []};

	/** Search bar control. */
	public searchControl: FormControl					= new FormControl();

	/** Search bar autocomplete options. */
	public searchOptions: Observable<User[]>			= this.searchControl.valueChanges.pipe(
		map<string, string>(query => query.toLowerCase().trim()),
		mergeMap<string, User[]>(query => this.accountContactsService.contactUsernames.pipe(
			mergeMap(async usernames => {
				if (!compareArrays(usernames, this.userCache.usernames)) {
					this.userCache	= {
						usernames,
						users: filterUndefined(await Promise.all(usernames.map(async username =>
							this.accountUserLookupService.getUser(username)
						)))
					};
				}

				return (await Promise.all(this.userCache.users.map(async user => ({
					name: (await user.name.pipe(take(1)).toPromise()).toLowerCase(),
					user,
					username: user.username
				})))).
					filter(({name, username}) =>
						name.indexOf(query) > -1 ||
						username.startsWith(query)
					).
					map(({user}) => user).
					sort((a, b) =>
						a.username === query ?
							-1 :
							b.username === query ?
								1 :
								a.username < b.username ?
									-1 :
									1
					).
					slice(0, this.accountContactsService.contactListLength)
				;
			})
		))
	);

	/** Indicates whether this is contained within a sidebar. */
	@Input() public sidebar: boolean					= false;

	/** Single contact to display instead of list. */
	public userFilter?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** Clears user filter. */
	public clearUserFilter () : void {
		this.userFilter	= undefined;
		this.searchControl.setValue('');
	}

	/** Indicates whether the chat UI is open for this user. */
	public isActive (contact: User) : boolean {
		const snapshot	= this.activatedRouteService.snapshot.firstChild ?
			this.activatedRouteService.snapshot.firstChild :
			this.activatedRouteService.snapshot
		;

		return contact.username === snapshot.params.username &&
			snapshot.url.map(o => o.path)[0] === 'chat'
		;
	}

	/** Sets user filter based on search query. */
	public async setUserFilter (username: string) : Promise<void> {
		this.userFilter	= await this.accountUserLookupService.getUser(username);
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
