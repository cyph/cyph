import {AfterViewInit, Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {IVirtualScrollOptions} from 'od-virtualscroll';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {of} from 'rxjs/observable/of';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {User, UserPresence} from '../account';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';
import {observableToBehaviorSubject} from '../util/flatten-observable-promise';
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
		this.activatedRoute.url.pipe(
			mergeMap(() => this.accountContactsService.contactList)
		)
	;

	/** Full contact list with active contact filtered out. */
	public readonly activeUser: Observable<User|undefined>	=
		this.routeReactiveContactList.pipe(
			map(contacts => contacts.find(contact => this.isActive(contact)))
		)
	;

	/** @see AccountContactsSearchComponent.clearUserFilter */
	public clearUserFilter: () => void;

	/** Full contact list with active contact filtered out. */
	public readonly contactList: BehaviorSubject<User[]>	= observableToBehaviorSubject(
		this.routeReactiveContactList.pipe(
			map(contacts => contacts.filter(contact => !this.isActive(contact)))
		),
		[]
	);

	/** Indicates whether contact list should be displayed. */
	public showContactList: boolean							= false;

	/** @see AccountContactsSearchComponent.userFilter */
	public userFilter: BehaviorSubject<User|undefined>		= new BehaviorSubject(undefined);

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence		= UserPresence;

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
