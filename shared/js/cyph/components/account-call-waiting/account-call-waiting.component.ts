import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	Input,
	OnChanges,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {BehaviorSubject, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {User} from '../../account/user';
import {BaseProvider} from '../../base-provider';
import {AccountUserTypes, CallTypes, IAppointment} from '../../proto';
import {AccountP2PService} from '../../services/account-p2p.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {ChatService} from '../../services/chat.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {observableAll} from '../../util/observable-all';
import {sleep} from '../../util/wait';
import {AccountComposeNoProvidersComponent} from '../account-compose-no-providers';

/**
 * Angular component for account call waiting UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-call-waiting',
	styleUrls: ['./account-call-waiting.component.scss'],
	templateUrl: './account-call-waiting.component.html'
})
export class AccountCallWaitingComponent extends BaseProvider
	implements AfterViewInit, OnChanges {
	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** @see AccountChatComponent.answering */
	@Input() public answering: boolean = false;

	/** @see AccountChatComponent.appointment */
	@Input() public appointment?: IAppointment & {id: string};

	/** @see AccountUserTypes */
	public readonly callTypes = CallTypes;

	/** Component for composing forms. */
	@ViewChild('formCompose', {read: AccountComposeNoProvidersComponent})
	public formCompose?: AccountComposeNoProvidersComponent;

	/** Participants by type. */
	public readonly participantsByType = new BehaviorSubject(
		new Map<AccountUserTypes, User[]>()
	);

	/** @inheritDoc */
	public async ngOnChanges (changes: SimpleChanges) : Promise<void> {
		if (!changes.appointment) {
			return;
		}

		const participantsByType = new Map<AccountUserTypes, User[]>();

		try {
			if (
				!this.appointment ||
				!this.appointment.participants ||
				this.appointment.participants.length < 1
			) {
				return;
			}

			const users = await Promise.all(
				this.appointment.participants.map(async username => {
					const user = await this.accountUserLookupService.getUser(
						username
					);
					if (!user) {
						return user;
					}
					return {
						user,
						userType: (await user.accountUserProfile.getValue())
							.userType
					};
				})
			);

			for (const o of users) {
				if (!o) {
					continue;
				}

				const arr = participantsByType.get(o.userType) || [];
				arr.push(o.user);
				participantsByType.set(o.userType, arr);
			}
		}
		finally {
			this.participantsByType.next(participantsByType);
		}
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		try {
			if (!this.formCompose) {
				throw new Error('No formCompose.');
			}

			if (
				!(
					this.envService.isTelehealth &&
					(this.appointment?.forms &&
						this.appointment.forms.length < 1)
				)
			) {
				return;
			}

			await sleep(0);

			if (this.destroyed.value) {
				return;
			}

			this.subscriptions.push(
				observableAll([
					this.accountDatabaseService.currentUser.pipe(
						switchMap(o => (o ? o.user.userType : of(undefined)))
					),
					this.formCompose.sent
				])
					.pipe(
						map(
							([userType, sent]) =>
								sent !== true &&
								userType === AccountUserTypes.Standard
						)
					)
					.subscribe(this.sessionService.freezePong)
			);
		}
		finally {
			this.accountService.transitionEnd();
		}
	}

	/** Telehealth appointment UI. */
	public get telehealthAppointment () : boolean {
		return !!(
			this.envService.isTelehealth &&
			this.appointment &&
			this.appointment.calendarInvite.callType &&
			this.appointment.calendarInvite.title
		);
	}

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountP2PService */
		public readonly accountP2PService: AccountP2PService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
