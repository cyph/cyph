import {
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges
} from '@angular/core';
import {Router} from '@angular/router';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs';
import {IContactListItem, User, UserPresence} from '../../account';
import {BaseProvider} from '../../base-provider';
import {
	AccountContactState,
	AccountUserTypes,
	IAccountMessagingGroup
} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountOrganizationsService} from '../../services/account-organizations.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {StringsService} from '../../services/strings.service';
import {normalizeArray} from '../../util/formatting';
import {openWindow} from '../../util/window';

/**
 * Angular component for account contact UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-contact',
	styleUrls: ['./account-contact.component.scss'],
	templateUrl: './account-contact.component.html'
})
export class AccountContactComponent extends BaseProvider implements OnChanges {
	/** @see AccountContactState.States */
	public readonly accountContactStates = AccountContactState.States;

	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** Indicates whether links should be enabled. */
	@Input() public clickable: boolean = true;

	/** Contact. */
	@Input() public contact?: IContactListItem | User;

	/** Gets user org. */
	public readonly getUserOrg = memoize(async (username: string) =>
		this.accountOrganizationsService.getOrganization(username)
	);

	/** If true, will hide itself if `this.contact` is the same as the currently logged in user. */
	@Input() public hideCurrentUser: boolean = false;

	/** @see openWindow */
	public readonly openWindow = openWindow;

	/** @see P2PWebRTCService.isSupported */
	public readonly p2pSupported = P2PWebRTCService.isSupported;

	/** Indicates whether unread message count should be displayed. */
	@Input() public showUnreadMessageCount: boolean = false;

	/** If true, will act as a button to start a new Burner chat. */
	@Input() public startBurner: boolean = false;

	/** If true, will act as a button to start a new group chat. */
	@Input() public startGroup: boolean = false;

	/** This user. */
	public readonly user: BehaviorSubject<
		User | undefined
	> = new BehaviorSubject<User | undefined>(undefined);

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** @see IContactListItem.anonymousUser */
	public get anonymousUser () : {name: string} | undefined {
		return this.contact && 'anonymousUser' in this.contact ?
			this.contact.anonymousUser :
			undefined;
	}

	/** @see IContactListItem.groupData */
	public get groupData () :
		| {
				group: IAccountMessagingGroup;
				id: string;
				incoming: boolean;
		  }
		| undefined {
		return this.contact && 'groupData' in this.contact ?
			this.contact.groupData :
			undefined;
	}

	/** Group username list. */
	public get groupUsernames () : string | undefined {
		const groupData = this.groupData;

		return groupData?.group.usernames ?
			'@' +
				normalizeArray(
					groupData.group.usernames.filter(
						username =>
							!this.accountDatabaseService.currentUser.value ||
							this.accountDatabaseService.currentUser.value.user
								.username !== username
					)
				).join(', @') :
			undefined;
	}

	/** @inheritDoc */
	public async ngOnChanges () : Promise<void> {
		const user =
			!this.contact || this.contact instanceof User ?
				this.contact :
				await this.contact.user;

		this.user.next(user);

		if (user) {
			await user.fetch();
		}
	}

	/** This user's username. */
	public get username () : string {
		return this.contact ? this.contact.username : '';
	}

	constructor (
		/** @see Router */
		public readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountOrganizationsService */
		public readonly accountOrganizationsService: AccountOrganizationsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
