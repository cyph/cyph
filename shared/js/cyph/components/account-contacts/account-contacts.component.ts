import {AfterViewInit, Component, Input, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {IVirtualScrollOptions} from 'od-virtualscroll';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {of} from 'rxjs/observable/of';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {User, UserPresence} from '../../account';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {cacheObservable} from '../../util/flatten-observable';
import {sleep} from '../../util/wait';
import {AccountContactsSearchComponent} from '../account-contacts-search';


/**
 * Angular component for account contacts UI.
 */
@Component({
	selector: 'cyph-account-contacts',
	styleUrls: ['./account-contacts.component.scss'],
	templateUrl: './account-contacts.component.html'
})
export class AccountContactsComponent implements AfterViewInit, OnInit {
	/** @ignore */
	private readonly routeReactiveContactList: Observable<User[]>	=
		this.activatedRoute.url.pipe(mergeMap(() => this.contactList))
	;

	/** @see AccountContactsSearchComponent */
	@ViewChild(AccountContactsComponent)
	public accountContactsSearch?: AccountContactsSearchComponent;

	/** Full contact list with active contact filtered out. */
	public readonly activeUser: Observable<User|undefined>			=
		this.routeReactiveContactList.pipe(
			map(contacts => contacts.find(contact => this.isActive(contact)))
		)
	;

	/** List of users to search. */
	@Input() public contactList: Observable<User[]>					=
		this.accountContactsService.contactList
	;

	/** Full contact list with active contact filtered out. */
	public readonly filteredContactList: BehaviorSubject<User[]>	= cacheObservable(
		this.routeReactiveContactList.pipe(
			map(contacts => contacts.filter(contact => !this.isActive(contact)))
		),
		[]
	);

	/** Indicates whether to use inverted theme. */
	@Input() public invertedTheme: boolean							= false;

	/** @see AccountContactsSearchComponent.searchProfileExtra */
	@Input() public searchProfileExtra: boolean						= false;

	/** Indicates whether contact list should be displayed. */
	public showContactList: boolean									= false;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence				= UserPresence;

	/** Equality function for virtual scrolling. */
	public readonly vsEqualsFunc: (a: number, b: number) => boolean	= (() => {
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

	/** Indicates whether the chat UI is open for this user. */
	private isActive (contact: User) : boolean {
		const snapshot	= this.activatedRoute.snapshot.firstChild ?
			this.activatedRoute.snapshot.firstChild :
			this.activatedRoute.snapshot
		;

		return contact.username === snapshot.params.username &&
			snapshot.url.map(o => o.path)[0] === 'messages'
		;
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await sleep(0);
		this.showContactList	= true;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
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
