import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	Output,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, combineLatest, Observable, Subscription} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {IContactListItem, User, UserPresence} from '../../account';
import {BaseProvider} from '../../base-provider';
import {AccountUserTypes} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackByUser} from '../../track-by/track-by-user';
import {filterUndefined} from '../../util/filter';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {observableAll} from '../../util/observable-all';
import {AccountContactsSearchComponent} from '../account-contacts-search';


/**
 * Angular component for account contacts UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-contacts',
	styleUrls: ['./account-contacts.component.scss'],
	templateUrl: './account-contacts.component.html'
})
export class AccountContactsComponent extends BaseProvider
implements AfterViewInit, OnChanges, OnDestroy, OnInit {
	/** @ignore */
	private readonly contactListInternal: BehaviorSubject<(IContactListItem|User)[]>	=
		new BehaviorSubject<(IContactListItem|User)[]>([])
	;

	/** @ignore */
	private contactListSubscription?: Subscription;

	/** @ignore */
	private readonly routeReactiveContactList: Observable<{
		activeUser?: IContactListItem|User|undefined;
		filteredContactList: (IContactListItem|User)[];
	}>	= combineLatest(
		this.contactListInternal,
		this.activatedRoute.data,
		this.accountService.routeChanges
	).pipe(mergeMap(async ([contactList, data]) => {
		const snapshot			= this.activatedRoute.snapshot.firstChild ?
			this.activatedRoute.snapshot.firstChild :
			this.activatedRoute.snapshot
		;

		const username			=
			typeof snapshot.params.username === 'string' ?
				snapshot.params.username :
				(await this.accountContactsService.getContactUsername(
					snapshot.params.contactID
				).catch(() =>
					undefined
				))
		;

		let userTypeFilter: AccountUserTypes|undefined	= data.userTypeFilter;
		let userTypeFilterOut: boolean					= data.userTypeFilterOut === true;

		/* Filter out patients for healthcare workers in general case */
		if (this.envService.isTelehealth && userTypeFilter === undefined) {
			userTypeFilter		= AccountUserTypes.Standard;
			userTypeFilterOut	= true;
		}

		if (userTypeFilter !== undefined) {
			contactList	= filterUndefined(
				await Promise.all(contactList.map(async contact => {
					const user	= contact instanceof User ? contact : await contact.user;
					return !user ? undefined : {
						user,
						userType: (await user.accountUserProfile.getValue()).userType
					};
				}))
			).filter(contact =>
				userTypeFilterOut ?
					contact.userType !== userTypeFilter :
					contact.userType === userTypeFilter
			).map(contact =>
				contact.user
			);
		}

		const index	=
			username ?
				contactList.findIndex(contact => contact.username === username) :
			snapshot.params.contactID ?
				contactList.findIndex(contact =>
					'groupData' in contact &&
					contact.groupData !== undefined &&
					contact.groupData.id === snapshot.params.contactID
				) :
				-1
		;

		if (index < 0) {
			if (!username) {
				return {filteredContactList: contactList};
			}

			this.accountService.activeSidebarContact.next(username);

			return {
				activeUser: await this.accountUserLookupService.getUser(username, false),
				filteredContactList: contactList
			};
		}

		return {
			activeUser: contactList[index],
			filteredContactList: contactList.slice(0, index).concat(contactList.slice(index + 1))
		};
	}));

	/** @see AccountContactsSearchComponent */
	@ViewChild(AccountContactsSearchComponent)
	public accountContactsSearch?: AccountContactsSearchComponent;

	/** Full contact list with active contact filtered out. */
	public readonly activeUser													=
		toBehaviorSubject(
			this.routeReactiveContactList.pipe(map(o => o.activeUser)),
			undefined,
			this.subscriptions
		)
	;

	/** List of users to search. */
	@Input() public contactList: Observable<(IContactListItem|User)[]>			=
		this.accountContactsService.contactList
	;

	/** Full contact list with active contact removed and users with unread messages on top. */
	public readonly filteredContactList: Observable<(IContactListItem|User)[]>	=
		this.routeReactiveContactList.pipe(mergeMap(o =>
			observableAll(
				o.filteredContactList.map(({unreadMessageCount}) => unreadMessageCount)
			).pipe(map(counts =>
				this.contactList !== this.accountContactsService.contactList ?
					o.filteredContactList :
					[
						...(o.filteredContactList.filter((_: any, i: number) => counts[i] > 0)),
						...(o.filteredContactList.filter((_: any, i: number) => counts[i] < 1))
					]
			))
		))
	;

	/** Indicates whether this is home component. */
	@Input() public home: boolean												= false;

	/** Indicates whether to use inverted theme. */
	@Input() public invertedTheme: boolean										= false;

	/** @see AccountContactsSearchComponent.searchBarBlur */
	@Output() public readonly searchBarBlur										=
		new EventEmitter<void>()
	;

	/** Search mode. */
	@Input() public searchMode: boolean											= false;

	/** @see AccountContactsSearchComponent.searchProfileExtra */
	@Input() public searchProfileExtra: boolean									= false;

	/** Indicates whether being used in the sidebar. */
	@Input() public sidebar: boolean											= false;

	/** @see trackByUser */
	public readonly trackByUser: typeof trackByUser								= trackByUser;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence							= UserPresence;

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		if (
			!this.sidebar ||
			!this.accountContactsSearch ||
			!this.accountContactsSearch.searchBar
		) {
			return;
		}

		this.subscriptions.push(
			combineLatest(
				this.activeUser,
				this.accountContactsSearch.searchBar.filterSingle
			).subscribe(([a, b]) => {
				this.accountService.activeSidebarContact.next(
					a ? a.username : b ? b.username : undefined
				);
			})
		);
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (!('contactList' in changes)) {
			return;
		}

		if (this.contactListSubscription) {
			this.contactListSubscription.unsubscribe();
		}

		this.contactListSubscription	= this.contactList.subscribe(this.contactListInternal);
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.activeUser.next(undefined);
		/* tslint:disable-next-line:no-life-cycle-call */
		super.ngOnDestroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.contactListSubscription	= this.contactList.subscribe(this.contactListInternal);
		this.accountService.transitionEnd();
	}

	/** If true, tell user when they have no friends. */
	public get youHaveNoFriends () : boolean {
		return this.contactList === this.accountContactsService.contactList;
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
