import {AfterViewInit, Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {IVirtualScrollOptions} from 'od-virtualscroll';
import {Observable} from 'rxjs/Observable';
import {of} from 'rxjs/observable/of';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {take} from 'rxjs/operators/take';
import {User, UserPresence} from '../account';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {sleep} from '../util/wait';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['../../../css/components/account-contacts.scss'],
	templateUrl: '../../../templates/account-contacts.html'
})
export class AccountContactsComponent implements AfterViewInit {
	/** @ignore */
	private readonly routeReactiveContactList: Observable<User[]>	=
		this.activatedRouteService.url.pipe(
			mergeMap(() => this.accountContactsService.contactList)
		)
	;

	/** Full contact list with active contact filtered out. */
	public readonly activeUser: Observable<User|undefined>	=
		this.routeReactiveContactList.pipe(
			map(contacts => contacts.find(contact => this.isActive(contact)))
		)
	;

	/** Full contact list with active contact filtered out. */
	public readonly contactList: Observable<User[]>			=
		this.routeReactiveContactList.pipe(
			map(contacts => contacts.filter(contact => !this.isActive(contact)))
		)
	;

	/** Search bar control. */
	public searchControl: FormControl						= new FormControl();

	/** Search bar autocomplete options list length. */
	public readonly searchListLength: number				= 10;

	/** Search bar autocomplete options. */
	public searchOptions: Observable<User[]>				= this.searchControl.valueChanges.pipe(
		map<string, string>(query => {
			this.searchSpinner	= true;
			return query.toLowerCase().trim();
		}),
		mergeMap<string, User[]>(query => this.accountContactsService.contactList.pipe(
			mergeMap(async users => {
				this.searchSpinner	= false;

				return (await Promise.all(users.map(async user => ({
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
			})
		))
	);

	/** Indicates whether spinner should be displayed in search bar. */
	public searchSpinner: boolean							= false;

	/** Indicates whether contact list should be displayed. */
	public showContactList: boolean							= false;

	/** Single contact to display instead of list. */
	public userFilter?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence		= UserPresence;

	/** Options for virtual scrolling. */
	public readonly vsOptions: Observable<IVirtualScrollOptions>	= of({
		itemHeight: 123,
		numLimitColumns: 1
	});

	/** Indicates whether the chat UI is open for this user. */
	private isActive (contact: User) : boolean {
		const snapshot	= this.activatedRouteService.snapshot.firstChild ?
			this.activatedRouteService.snapshot.firstChild :
			this.activatedRouteService.snapshot
		;

		return contact.username === snapshot.params.username &&
			snapshot.url.map(o => o.path)[0] === 'chat'
		;
	}

	/** Clears user filter. */
	public clearUserFilter () : void {
		this.userFilter	= undefined;
		this.searchControl.setValue('');
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await sleep(0);
		this.showContactList	= true;
	}

	/** Sets user filter based on search query. */
	public async setUserFilter (username: string) : Promise<void> {
		this.userFilter	= await this.accountUserLookupService.getUser(username);
	}

	/** Equality function for virtual scrolling. */
	public vsEqualsFunc () : boolean {
		return false;
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
