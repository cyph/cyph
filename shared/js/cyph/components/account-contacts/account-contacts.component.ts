import {Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {IVirtualScrollOptions} from 'od-virtualscroll';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {of} from 'rxjs/observable/of';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {IContactListItem, User, UserPresence} from '../../account';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {AccountContactsSearchComponent} from '../account-contacts-search';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['./account-contacts.component.scss'],
	templateUrl: './account-contacts.component.html'
})
export class AccountContactsComponent implements OnChanges, OnInit {
	/** @ignore */
	private readonly contactListInternal: BehaviorSubject<IContactListItem[]>	=
		new BehaviorSubject<IContactListItem[]>([])
	;

	/** @ignore */
	private readonly routeReactiveContactList: Observable<{
		activeUser?: Promise<User|undefined>;
		filteredContactList: IContactListItem[];
	}>	= combineLatest(
		this.contactListInternal,
		this.activatedRoute.url
	).pipe(map(([contactList]) => {
		const snapshot			= this.activatedRoute.snapshot.firstChild ?
			this.activatedRoute.snapshot.firstChild :
			this.activatedRoute.snapshot
		;

		const username: string	= snapshot.params.username;

		if (!username) {
			return {filteredContactList: contactList};
		}

		const index	= contactList.findIndex(contact => contact.username === username);

		if (index < 0) {
			return {filteredContactList: contactList};
		}

		return {
			activeUser: contactList[index].user,
			filteredContactList: contactList.slice(0, index).concat(contactList.slice(index + 1))
		};
	}));

	/** @see AccountContactsSearchComponent */
	@ViewChild(AccountContactsComponent)
	public accountContactsSearch?: AccountContactsSearchComponent;

	/** Full contact list with active contact filtered out. */
	public readonly activeUser: Observable<User|undefined>				=
		this.routeReactiveContactList.pipe(mergeMap(async o => o.activeUser))
	;

	/** List of users to search. */
	@Input() public contactList: Observable<IContactListItem[]>			=
		this.accountContactsService.contactList
	;

	/** Full contact list with active contact filtered out. */
	public readonly filteredContactList: Observable<IContactListItem[]>	=
		this.routeReactiveContactList.pipe(map(o => o.filteredContactList))
	;

	/** Indicates whether to use inverted theme. */
	@Input() public invertedTheme: boolean								= false;

	/** @see AccountContactsSearchComponent.searchProfileExtra */
	@Input() public searchProfileExtra: boolean							= false;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence					= UserPresence;

	/** Equality function for virtual scrolling. */
	public readonly vsEqualsFunc: (a: number, b: number) => boolean		= (() => {
		/*
		const contactList	= this.contactList;

		return (a: number, b: number) =>
			contactList.value.length > a &&
			contactList.value.length > b &&
			contactList.value[a].username === contactList.value[b].username
		;
		*/

		return () => false;
	})();

	/** Options for virtual scrolling. */
	public readonly vsOptions: Observable<IVirtualScrollOptions>	= of({
		itemHeight: 123,
		numLimitColumns: 1
	});

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if ('contactList' in changes) {
			this.contactList.subscribe(this.contactListInternal);
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.contactList.subscribe(this.contactListInternal);
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
