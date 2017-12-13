import {
	Component,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output,
	SimpleChanges
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {take} from 'rxjs/operators/take';
import {Subscription} from 'rxjs/Subscription';
import {User} from '../account/user';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account contacts search UI.
 */
@Component({
	selector: 'cyph-account-contacts-search',
	styleUrls: ['../../../css/components/account-contacts-search.scss'],
	templateUrl: '../../../templates/account-contacts-search.html'
})
export class AccountContactsSearchComponent implements OnChanges, OnInit {
	/** @ignore */
	private searchUsernameSubscription?: Subscription;

	/** Placeholder string. */
	@Input() public placeholder: string						= this.stringsService.search;

	/** Search bar control. */
	public searchControl: FormControl						= new FormControl();

	/** Search bar autocomplete options list length. */
	public readonly searchListLength: number				= 10;

	/** Search bar autocomplete options. */
	public searchOptions									= this.searchControl.valueChanges.pipe(
		map<string, string>(query => {
			this.searchSpinner	= true;
			return query.toLowerCase().trim();
		}),
		mergeMap<string, {externalUser?: string; users: User[]}>(query =>
			this.accountContactsService.contactList.pipe(mergeMap(async users => {
				const results	= (await Promise.all(users.map(async user => ({
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
					slice(0, this.searchListLength)
				;

				const externalUser	= (
					(results.length < 1 || results[0].username !== query) &&
					(await this.accountUserLookupService.exists(query))
				) ?
					query :
					undefined
				;

				this.searchSpinner	= false;

				return {externalUser, users: results};
			}))
		)
	);

	/** Indicates whether spinner should be displayed in search bar. */
	public searchSpinner: boolean							= false;

	/** @see AccountContactsSearchComponent.searchUsername */
	@Input() public searchUsername?: Observable<string>;

	/** Single contact to display instead of list. */
	public userFilter: BehaviorSubject<User|undefined>		= new BehaviorSubject(undefined);

	@Output() public readonly userFilterChange: EventEmitter<BehaviorSubject<User|undefined>>	=
		new EventEmitter<BehaviorSubject<User|undefined>>()
	;

	/** Clears user filter. */
	public clearUserFilter () : void {
		this.userFilter.next(undefined);
		this.searchControl.setValue('');
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (!changes.searchUsername) {
			return;
		}

		if (this.searchUsernameSubscription) {
			this.searchUsernameSubscription.unsubscribe();
		}

		if (this.searchUsername) {
			this.searchUsernameSubscription	= this.searchUsername.subscribe(username => {
				this.searchControl.setValue(username);
				this.setUserFilter(username);
			});
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.userFilterChange.emit(this.userFilter);
	}

	/** Sets user filter based on search query. */
	public async setUserFilter (username: string) : Promise<void> {
		if (username) {
			this.userFilter.next(await this.accountUserLookupService.getUser(username));
		}
		else {
			this.userFilter.next(undefined);
		}
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
