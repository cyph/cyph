import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	Output,
	ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {IContactListItem, User} from '../../account';
import {Async} from '../../async-type';
import {BaseProvider} from '../../base-provider';
import {IResolvable} from '../../iresolvable';
import {ISearchOptions} from '../../isearch-options';
import {AccountUserProfileExtra} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {filterUndefined} from '../../util/filter';
import {SearchBarComponent} from '../search-bar';


/**
 * Angular component for account contacts search UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-contacts-search',
	styleUrls: ['./account-contacts-search.component.scss'],
	templateUrl: './account-contacts-search.component.html'
})
export class AccountContactsSearchComponent extends BaseProvider {
	/** @see SearchBarComponent.autofocus */
	@Input() public autofocus: boolean		= false;

	/** @see SearchBarComponent.chipInput */
	@Input() public chipInput: boolean		= false;

	/** List of users to search. */
	@Input() public contactList: Observable<(IContactListItem|User)[]>|undefined	=
		this.accountContactsService.contactList
	;

	/** Allows looking up non-contact users by exact username match and opening their profiles. */
	@Input() public externalUsers: boolean	= false;

	/** If set, display button to submit selected contacts to this resolvable. */
	@Input() public getContacts?: IResolvable<User[]>;

	/** @see SearchBarComponent.placeholder */
	@Input() public placeholder?: string;

	/** @see SearchBarComponent */
	@ViewChild(SearchBarComponent) public searchBar?: SearchBarComponent<User>;

	/** @see SearchBarComponent.inputBlur */
	@Output() public readonly searchBarBlur						= new EventEmitter<void>();

	/** @see SearchBarComponent.control */
	@Input() public readonly searchControl: FormControl			= new FormControl();

	/** @see SearchBarComponent.listLength */
	@Input() public searchListLength: number					= 10;

	/** @see SearchBarComponent.options */
	public readonly searchOptions: Observable<ISearchOptions>	=
		this.searchControl.valueChanges.pipe(
			map<string, string>(query => query.toLowerCase().trim()),
			mergeMap(async query => {
				this.searchSpinner.next(true);

				const users		=
					this.contactList ?
						await this.accountContactsService.fullyLoadContactList(
							this.contactList
						).pipe(take(1)).toPromise() :
						[]
				;

				const results	= filterUndefined(
					(await Promise.all(users.map(async user => ({
						extra: this.searchProfileExtra ?
							await user.accountUserProfileExtra.getValue() :
							undefined
						,
						name: (await user.accountUserProfile.getValue()).name,
						user,
						username: user.username
					})))).
						map(({extra, name, user, username}) => {
							if (
								username.startsWith(query) ||
								name.toLowerCase().indexOf(query) > -1
							) {
								return {matchingText: undefined, user};
							}

							if (extra === undefined) {
								return;
							}

							const matchingText	= (<string[]> []).
								concat(extra.address || []).
								concat((<AccountUserProfileExtra.IPosition[]> []).
									concat(extra.education || []).
									concat(extra.work || []).
									map(position => (<string[]> []).
										concat(position.detail || []).
										concat(position.locationName || [])
									).
									reduce((a, b) => a.concat(b), [])
								).
								concat(extra.insurance || []).
								concat(extra.npis || []).
								concat(extra.specialties || []).
								find(s => s.toLowerCase().indexOf(query) > -1)
							;

							return matchingText === undefined ?
								undefined :
								{matchingText, user}
							;
						})
				).
					sort((a, b) =>
						a.user.username === query ?
							-1 :
							b.user.username === query ?
								1 :
								a.user.username < b.user.username ?
									-1 :
									1
					).
					slice(0, this.searchListLength)
				;

				let externalUser	= (
					this.externalUsers &&
					(results.length < 1 || results[0].user.username !== query) &&
					(await this.accountUserLookupService.exists(query, false, false))
				) ?
					query :
					undefined
				;

				this.searchSpinner.next(false);

				if (this.chipInput && externalUser) {
					externalUser	= undefined;
					const user		= await this.accountUserLookupService.getUser(query, false);

					if (user) {
						results.unshift({matchingText: undefined, user});
					}
				}

				return {
					imageAltText: this.stringsService.userAvatar,
					items: results.map(({matchingText, user}) => ({
						image: user.avatar,
						matchingText,
						smallText: user.realUsername.pipe(map(realUsername =>
							`@${realUsername}`
						)),
						text: user.name,
						value: user.username
					})),
					topOption: externalUser === undefined ? undefined : {
						routerLink: `/profile/${externalUser}`,
						text:
							`${this.stringsService.open} ` +
							`@${externalUser}${this.stringsService.s} ` +
							this.stringsService.profile
					}
				};
			})
		)
	;

	/** If true, downloads User.extra and queries it for the search. */
	@Input() public searchProfileExtra: boolean					= false;

	/** @see SearchBarComponent.spinner */
	public readonly searchSpinner: BehaviorSubject<boolean>		= new BehaviorSubject<boolean>(false);

	/** @see SearchBarComponent.query */
	@Input() public searchUsername?: Observable<string>;

	/** Title. */
	@Input() public title?: string;

	/** @see SearchBarComponent.chipTransform */
	public readonly userChipTransform: (user?: User) => {
		smallText?: Async<string>;
		text: Async<string>;
	}	=
		user => !user ?
			{text: Promise.resolve('')} :
			{smallText: user.realUsername.pipe(map(s => `@${s}`)), text: user.name}
	/* tslint:disable-next-line:semicolon */
	;

	/** @see SearchBarComponent.filterChange */
	@Output() public readonly userFilterChange: EventEmitter<BehaviorSubject<Set<User>>>	=
		new EventEmitter<BehaviorSubject<Set<User>>>()
	;

	/** @see SearchBarComponent.filterTransform */
	public readonly userFilterTransform: (username: string) => Async<User|undefined>		=
		async username => this.accountUserLookupService.getUser(username, false)
	/* tslint:disable-next-line:semicolon */
	;

	/** Default placeholder. */
	public get defaultPlaceHolder () : string {
		return this.envService.isTelehealth && this.searchProfileExtra ?
			this.stringsService.telehealthSearch :
			this.stringsService.search
		;
	}

	/** Submits selected contacts. */
	public submitContacts (
		contacts: User[] = this.searchBar ? Array.from(this.searchBar.filter.value) : []
	) : void {
		if (!this.getContacts) {
			return;
		}

		this.getContacts.resolve(contacts);
	}

	constructor (
		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see StringsService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}


AccountContactsService.accountContactsSearchComponent.resolve(AccountContactsSearchComponent);
