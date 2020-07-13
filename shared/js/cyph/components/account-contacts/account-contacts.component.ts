import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
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
import {BehaviorSubject, Observable, of, ReplaySubject} from 'rxjs';
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import {map, switchMap, tap} from 'rxjs/operators';
import {
	IContactListItem,
	NewContactTypes,
	SecurityModels,
	User,
	UserPresence
} from '../../account';
import {BaseProvider} from '../../base-provider';
import {AccountContactState, AccountUserTypes, BooleanProto} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {StringsService} from '../../services/strings.service';
import {trackByUser} from '../../track-by/track-by-user';
import {filterUndefined, filterUndefinedOperator} from '../../util/filter';
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
	implements OnChanges, OnDestroy, OnInit {
	/** @ignore */
	private readonly contactListInternal = new BehaviorSubject<
		| Observable<{
				contactList: (IContactListItem | User)[];
				innerCircleTab: boolean;
		  }>
		| undefined
	>(undefined);

	/** @ignore */
	private readonly routeReactiveContactList: Observable<{
		activeUser?: IContactListItem | User | undefined;
		filteredContactList: (IContactListItem | User)[];
		innerCircleTab: boolean;
	}>;

	/** @see AccountContactsSearchComponent */
	@ViewChild('accountContactsSearch', {read: AccountContactsSearchComponent})
	public accountContactsSearch?: AccountContactsSearchComponent;

	/** Full contact list with active contact filtered out. */
	public readonly activeUser: BehaviorSubject<
		IContactListItem | User | undefined
	>;

	/** List of users to search. */
	@Input() public contactList: Observable<(IContactListItem | User)[]> = this
		.accountContactsService.contactList;

	/**
	 * Full contact list with active contact removed and users with unread messages on top.
	 */
	public readonly filteredContactList: Observable<
		(IContactListItem | User)[]
	>;

	/** Indicates whether this is home component. */
	@Input() public home: boolean = false;

	/** Controls whether Inner Circle tab is selected. */
	public readonly innerCircleTab = new ReplaySubject<boolean>(1);

	/** Indicates whether to use inverted theme. */
	@Input() public invertedTheme: boolean = false;

	/** @see NewContactTypes */
	public readonly newContactTypes = NewContactTypes;

	/** If true, read-only mode. */
	@Input() public readOnly: boolean = false;

	/** @see AccountContactsSearchComponent.searchBarBlur */
	@Output() public readonly searchBarBlur = new EventEmitter<void>();

	/** Search mode. */
	@Input() public searchMode: boolean = false;

	/** @see AccountContactsSearchComponent.searchProfileExtra */
	@Input() public searchProfileExtra: boolean = false;

	/** Indicates whether spinner should be displayed. */
	public readonly showSpinner = this.innerCircleTab.pipe(
		switchMap(innerCircleTab =>
			innerCircleTab ?
				this.accountContactsService.spinners.contactsInnerCircle :
				this.accountContactsService.spinners.contacts
		)
	);

	/** Indicates whether being used in the sidebar. */
	@Input() public sidebar: boolean = false;

	/** @see trackByUser */
	public readonly trackByUser = trackByUser;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** @ignore */
	private initContactListInternal () : void {
		this.contactListInternal.next(
			this.innerCircleTab.pipe(
				switchMap(innerCircleTab =>
					(innerCircleTab ?
						this.accountContactsService.contactListInnerCircle :
						this.contactList
					).pipe(map(contactList => ({contactList, innerCircleTab})))
				)
			)
		);
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (!changes.contactList) {
			return;
		}

		this.initContactListInternal();
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.activeUser.next(undefined);
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		super.ngOnDestroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.initContactListInternal();
		this.accountService.transitionEnd();

		this.localStorageService
			.getItem('contactsInnerCircleTab', BooleanProto)
			.catch(() => false)
			.then(innerCircleTab => {
				this.innerCircleTab.next(innerCircleTab);
			});
	}

	/** Sets Inner Circle tab selection state. */
	public async setInnerCircleTab (selected: boolean) : Promise<void> {
		this.innerCircleTab.next(selected);

		await this.localStorageService.setItem(
			'contactsInnerCircleTab',
			BooleanProto,
			selected
		);
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

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see DialogService */
		public readonly dialogService: DialogService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.routeReactiveContactList = observableAll([
			this.contactListInternal.pipe(
				filterUndefinedOperator(),
				switchMap(o => o)
			),
			this.activatedRoute.data,
			this.accountService.routeChanges
		]).pipe(
			switchMap(async ([{contactList, innerCircleTab}, data]) => {
				const snapshot = this.activatedRoute.snapshot.firstChild ?
					this.activatedRoute.snapshot.firstChild :
					this.activatedRoute.snapshot;

				const username =
					typeof snapshot.params.username === 'string' ?
						snapshot.params.username :
						await this.accountContactsService
							.getContactUsername(snapshot.params.contactID)
							.catch(() => undefined);

				let userTypeFilter: AccountUserTypes | undefined =
					data.userTypeFilter;
				let userTypeFilterOut = data.userTypeFilterOut === true;

				/* Filter out patients for healthcare workers in general case */
				if (
					this.envService.isTelehealth &&
					userTypeFilter === undefined
				) {
					userTypeFilter = AccountUserTypes.Standard;
					userTypeFilterOut = true;
				}

				if (userTypeFilter !== undefined) {
					contactList = filterUndefined(
						await Promise.all(
							contactList.map(async contact => {
								const user =
									contact instanceof User ?
										contact :
										await contact.user;
								return !user ?
									undefined :
									{
										user,
										userType: (await user.accountUserProfile.getValue())
											.userType
									};
							})
						)
					)
						.filter(contact =>
							userTypeFilterOut ?
								contact.userType !== userTypeFilter :
								contact.userType === userTypeFilter
						)
						.map(contact => contact.user);
				}

				const index = username ?
					contactList.findIndex(
						contact => contact.username === username
					) :
				snapshot.params.contactID ?
					contactList.findIndex(
						contact =>
							'groupData' in contact &&
							contact.groupData !== undefined &&
							contact.groupData.id === snapshot.params.contactID
					) :
					-1;

				if (index < 0) {
					if (!username) {
						return {
							filteredContactList: contactList,
							innerCircleTab
						};
					}

					return {
						activeUser: {
							unreadMessageCount: this.accountUserLookupService.getUnreadMessageCount(
								username
							),
							user: this.accountUserLookupService.getUser(
								username
							),
							username
						},
						filteredContactList: contactList,
						innerCircleTab
					};
				}

				return {
					activeUser: contactList[index],
					filteredContactList: contactList
						.slice(0, index)
						.concat(contactList.slice(index + 1)),
					innerCircleTab
				};
			})
		);

		this.activeUser = toBehaviorSubject(
			this.routeReactiveContactList.pipe(map(o => o.activeUser)),
			undefined,
			this.subscriptions
		);

		this.filteredContactList = this.routeReactiveContactList.pipe(
			switchMap(o =>
				observableAll([
					of(o),
					observableAll(
						o.filteredContactList.map(
							({unreadMessageCount}) => unreadMessageCount
						)
					),
					observableAll(
						o.filteredContactList.map(({username}) =>
							this.accountDatabaseService.watch(
								`contacts/${username}`,
								AccountContactState,
								SecurityModels.unprotected,
								undefined,
								undefined,
								this.subscriptions
							)
						)
					)
				])
			),
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			tap(([{innerCircleTab}]) => {
				(innerCircleTab ?
					this.accountContactsService.spinners.contactsInnerCircle :
					this.accountContactsService.spinners.contacts
				).next(false);
			}),
			map(([o, counts, contactStates]) =>
				this.contactList !== this.accountContactsService.contactList ?
					o.filteredContactList :
					[
						...o.filteredContactList.filter(
							(_, i) =>
								counts[i] > 0 &&
								contactStates[i].value.state ===
									AccountContactState.States.IncomingRequest
						),
						...o.filteredContactList.filter(
							(_, i) =>
								counts[i] > 0 &&
								contactStates[i].value.state !==
									AccountContactState.States.IncomingRequest
						),
						...o.filteredContactList.filter(
							(_, i) =>
								counts[i] < 1 &&
								contactStates[i].value.state ===
									AccountContactState.States.IncomingRequest
						),
						...o.filteredContactList.filter(
							(_, i) =>
								counts[i] < 1 &&
								contactStates[i].value.state !==
									AccountContactState.States.IncomingRequest
						)
					]
			)
		);
	}
}
