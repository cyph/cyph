import {
	Component,
	EventEmitter,
	Input,
	Output,
	ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {User} from '../../account/user';
import {ISearchOptions} from '../../isearch-options';
import {AccountUserProfileExtra} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {SearchBarComponent} from '../search-bar';


/**
 * Angular component for account contacts search UI.
 */
@Component({
	selector: 'cyph-account-contacts-search',
	styleUrls: ['./account-contacts-search.component.scss'],
	templateUrl: './account-contacts-search.component.html'
})
export class AccountContactsSearchComponent {
	/** List of users to search. */
	@Input() public contactList: Observable<User[]>				=
		this.accountContactsService.contactList
	;

	/** @see SearchBarComponent.placeholder */
	@Input() public placeholder: string							= this.stringsService.search;

	/** @see SearchBarComponent */
	@ViewChild(SearchBarComponent) public searchBar?: SearchBarComponent;

	/** @see SearchBarComponent.control */
	@Input() public readonly searchControl: FormControl			= new FormControl();

	/** @see SearchBarComponent.listLength */
	@Input() public searchListLength: number					= 10;

	/** If true, downloads User.extra and queries it for the search. */
	@Input() public searchProfileExtra: boolean					= false;

	/** @see SearchBarComponent.options */
	public readonly searchOptions: Observable<ISearchOptions>	=
		this.searchControl.valueChanges.pipe(
			map<string, string>(query => {
				this.searchSpinner.next(true);
				return query.toLowerCase().trim();
			}),
			mergeMap<string, ISearchOptions>(query =>
				this.contactList.pipe(
					mergeMap<User[], ISearchOptions>(async users => {
						const results	= (await Promise.all(users.map(async user => ({
							extra: this.searchProfileExtra ?
								await user.accountUserProfileExtra.getValue() :
								undefined
							,
							name: (await user.accountUserProfile.getValue()).name,
							user,
							username: user.username
						})))).
							filter(({extra, name, username}) =>
								username.startsWith(query) ||
								[name].concat(extra === undefined ? [] : (<string[]> []).
									concat(extra.address || []).
									concat(
										(<AccountUserProfileExtra.IPosition[]> []).
											concat(extra.education || []).
											concat(extra.work || []).
											map(position => (<string[]> []).
												concat(position.detail || []).
												concat(position.locationName || [])
											).
											reduce((a, b) => a.concat(b), [])
									).
									concat(extra.insurance && extra.insurance.data || []).
									concat(extra.npi && extra.npi.data || []).
									concat(extra.specialties && extra.specialties.data || [])
								).find(
									s => s.toLowerCase().indexOf(query) > -1
								) !== undefined
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

						this.searchSpinner.next(false);

						return {
							imageAltText: this.stringsService.userAvatar,
							items: results.map(user => ({
								image: user.avatar,
								smallText: user.realUsername.pipe(map(realUsername =>
									`@${realUsername}`
								)),
								text: user.name,
								value: user.username
							})),
							topOption: externalUser === undefined ? undefined : {
								routerLink: `/account/profile/${externalUser}`,
								text:
									`${this.stringsService.open} ` +
									`@${externalUser}${this.stringsService.s} ` +
									this.stringsService.profile
							}
						};
					})
				)
			)
		)
	;

	/** @see SearchBarComponent.spinner */
	public readonly searchSpinner: BehaviorSubject<boolean>		= new BehaviorSubject(false);

	/** @see SearchBarComponent.query */
	@Input() public searchUsername?: Observable<string>;

	/** @see SearchBarComponent.filterChange */
	@Output() public readonly userFilterChange: EventEmitter<BehaviorSubject<User|undefined>>	=
		new EventEmitter<BehaviorSubject<User|undefined>>()
	;

	/** @see SearchBarComponent.filterTransform */
	public readonly userFilterTransform: (username: string) => Promise<User|undefined>			=
		async username => {
			return this.accountUserLookupService.getUser(username);
		}
	/* tslint:disable-next-line:semicolon */
	;

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
