import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router, UrlSegment} from '@angular/router';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {UserPresence} from '../../account/enums';
import {States, UiStyles} from '../../chat/enums';
import {AccountFileRecord, CallTypes, ChatMessageValue, IAppointment} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountP2PService} from '../../services/account-p2p.service';
import {AccountSessionService} from '../../services/account-session.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {StringsService} from '../../services/strings.service';
import {normalize} from '../../util/formatting';
import {lockFunction} from '../../util/lock';
import {sleep} from '../../util/wait';


/**
 * Angular component for account chat UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: accountChatProviders,
	selector: 'cyph-account-chat',
	styleUrls: ['./account-chat.component.scss'],
	templateUrl: './account-chat.component.html'
})
export class AccountChatComponent implements OnDestroy, OnInit {
	/** @ignore */
	private destroyed: boolean	= false;

	/** @ignore */
	private initiatedAppointmentID?: string;

	/** @ignore */
	private initiatedContactID?: string;

	/** Appointment data, when applicable. */
	public readonly appointment				=
		new BehaviorSubject<(IAppointment&{id: string})|undefined>(undefined)
	;

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes	=
		ChatMessageValue.Types
	;

	/** Indicates whether call is pending or not yet loaded. */
	public readonly initialCallPending		= combineLatest(
		this.p2pWebRTCService.initialCallPending,
		this.p2pWebRTCService.loading
	).pipe(map(([initialCallPending, loading]) =>
		initialCallPending || loading
	));

	/** @see ChatMessageValue.Types */
	public readonly messageType				= new BehaviorSubject<ChatMessageValue.Types>(
		ChatMessageValue.Types.Text
	);

	/** @see ChatMessageList.promptFollowup */
	public readonly promptFollowup			=
		new BehaviorSubject<string|undefined>(undefined)
	;

	/** @see States */
	public readonly states					= States;

	/** @see UiStyles */
	public readonly uiStyles				= UiStyles;

	/** @see UserPresence */
	public readonly userPresence			= UserPresence;

	/** @ignore */
	private async navigate (...url: string[]) : Promise<void> {
		this.destroyed	= true;
		this.router.navigate([accountRoot, 'chat-transition'], {skipLocationChange: true});
		await sleep(0);
		this.router.navigate([accountRoot, ...url]);
	}

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		this.destroyed	= true;

		if (this.p2pWebRTCService.isActive) {
			await this.p2pWebRTCService.close();
		}

		await this.accountSessionService.destroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();

		if (this.envService.isTelehealth) {
			this.messageType.next(ChatMessageValue.Types.Quill);
		}

		const lock	= lockFunction();

		this.accountService.routeChanges.pipe(mergeMap(() => combineLatest(
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.data :
				this.activatedRoute.data
			,
			this.activatedRoute.params,
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.url :
				this.activatedRoute.url
		))).subscribe(async ([
			{callType, ephemeralSubSession, init, promptFollowup},
			{appointmentID, contactID, sessionSubID},
			[{path}]
		]: [
			{
				callType?: 'audio'|'video';
				ephemeralSubSession?: boolean;
				init?: boolean;
				promptFollowup?: boolean;
			},
			{appointmentID?: string; contactID?: string; sessionSubID?: string},
			UrlSegment[]
		]) => lock(async () => {
			if (this.destroyed) {
				return;
			}

			try {
				if (this.initiatedAppointmentID) {
					if (appointmentID && this.initiatedAppointmentID !== appointmentID) {
						await this.navigate('appointments', path, appointmentID);
					}

					return;
				}

				if (this.initiatedContactID) {
					if (contactID && this.initiatedContactID !== contactID) {
						await this.navigate(path, contactID);
					}

					return;
				}

				let appointment: IAppointment&{id: string};

				if (appointmentID) {
					appointment	= {
						id: appointmentID,
						...(await this.accountFilesService.downloadFile(
							appointmentID,
							AccountFileRecord.RecordTypes.Appointment
						).result)
					};

					callType		=
						promptFollowup ?
							undefined :
						appointment.calendarInvite.callType === CallTypes.Video ?
							'video' :
						appointment.calendarInvite.callType === CallTypes.Audio ?
							'audio' :
							undefined
					;

					sessionSubID	= appointmentID;

					contactID		= await this.accountContactsService.getContactID(
						appointment.participants === undefined ?
							undefined :
							appointment.participants.find(participant =>
								this.accountDatabaseService.currentUser.value !== undefined &&
								(
									this.accountDatabaseService.currentUser.value.user.username
								) !== normalize(participant)
							)
					);

					this.appointment.next(appointment);
				}

				this.initiatedAppointmentID	= appointmentID;
				this.initiatedContactID		= contactID;

				if (!contactID) {
					return;
				}

				try {
					await this.accountChatService.setUser(
						contactID.indexOf(',') > -1 ?
							contactID.split(',') :
							await this.accountContactsService.getContactUsername(contactID)
						,
						undefined,
						callType,
						sessionSubID,
						ephemeralSubSession
					);
				}
				catch {
					this.router.navigate([accountRoot, '404']);
					return;
				}

				if (callType === undefined) {
					return;
				}

				if (init && sessionSubID) {
					await this.accountP2PService.initCall(callType, sessionSubID);
				}

				this.p2pWebRTCService.disconnect.pipe(take(1)).toPromise().then(async () => {
					if (!this.destroyed) {
						this.router.navigate(
							appointmentID ?
								[accountRoot, 'appointments', appointmentID, 'end'] :
								[accountRoot, 'messages', contactID]
						);

						if (appointment && appointmentID) {
							appointment.occurred	= true;

							await this.accountFilesService.updateAppointment(
								appointmentID,
								appointment,
								undefined,
								true
							);
						}
					}
				});
			}
			finally {
				if (promptFollowup) {
					this.promptFollowup.next(contactID || this.initiatedContactID);
				}
				else {
					this.promptFollowup.next(undefined);
				}
			}
		}));
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountChatService */
		public readonly accountChatService: AccountChatService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountP2PService */
		public readonly accountP2PService: AccountP2PService,

		/** @see AccountSessionService */
		public readonly accountSessionService: AccountSessionService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileTransferService */
		public readonly fileTransferService: FileTransferService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
