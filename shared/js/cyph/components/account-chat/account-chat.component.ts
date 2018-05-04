import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router, UrlSegment} from '@angular/router';
import {BehaviorSubject, combineLatest, concat, of} from 'rxjs';
import {filter, mergeMap, take} from 'rxjs/operators';
import {UserPresence} from '../../account/enums';
import {UiStyles} from '../../chat/enums';
import {CallTypes, ChatMessageValue, IAppointment} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSessionService} from '../../services/account-session.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {P2PService} from '../../services/p2p.service';
import {StringsService} from '../../services/strings.service';
import {normalize} from '../../util/formatting';
import {lockFunction} from '../../util/lock';
import {sleep} from '../../util/wait';


/**
 * Angular component for account chat UI.
 */
@Component({
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
	private initiatedUsername?: string;

	/** Appointment data, when applicable. */
	public readonly appointment: BehaviorSubject<(IAppointment&{id: string})|undefined>	=
		new BehaviorSubject<(IAppointment&{id: string})|undefined>(undefined)
	;

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes: typeof ChatMessageValue.Types	=
		ChatMessageValue.Types
	;

	/** @see ChatMessageValue.Types */
	public messageType: BehaviorSubject<ChatMessageValue.Types>			= new BehaviorSubject(
		ChatMessageValue.Types.Text
	);

	/** @see ChatMessageList.promptFollowup */
	public readonly promptFollowup: BehaviorSubject<string|undefined>	=
		new BehaviorSubject<string|undefined>(undefined)
	;

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles							= UiStyles;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence					= UserPresence;

	/** @ignore */
	private async navigate (...url: string[]) : Promise<void> {
		this.destroyed	= true;
		this.router.navigate([accountRoot, 'chat-transition']);
		await sleep(0);
		this.router.navigate([accountRoot, ...url]);
	}

	/** Indicates whether call is pending or not yet loaded. */
	public get initialCallPending () : boolean {
		return this.p2pWebRTCService.initialCallPending || this.p2pWebRTCService.loading;
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

		concat(
			of(undefined),
			this.router.events.pipe(filter(event => event instanceof NavigationEnd))
		).pipe(mergeMap(() => combineLatest(
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.data :
				this.activatedRoute.data
			,
			this.activatedRoute.params,
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.url :
				this.activatedRoute.url
		))).subscribe(async ([
			{callType, ephemeralSubSession, promptFollowup},
			{appointmentID, sessionSubID, username},
			[{path}]
		]: [
			{callType?: 'audio'|'video'; ephemeralSubSession?: boolean; promptFollowup?: boolean},
			{appointmentID?: string; sessionSubID?: string; username?: string},
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

				if (this.initiatedUsername) {
					if (username && this.initiatedUsername !== username) {
						await this.navigate(path, username);
					}

					return;
				}

				let appointment: IAppointment&{id: string};

				if (appointmentID) {
					appointment	= {
						id: appointmentID,
						...(await this.accountFilesService.downloadAppointment(
							appointmentID
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

					username		= appointment.participants === undefined ?
						undefined :
						appointment.participants.find(participant =>
							this.accountDatabaseService.currentUser.value !== undefined &&
							this.accountDatabaseService.currentUser.value.user.username !==
								normalize(participant)
						)
					;

					this.appointment.next(appointment);
				}

				this.initiatedAppointmentID	= appointmentID;
				this.initiatedUsername		= username;

				if (!username) {
					return;
				}

				await this.accountChatService.setUser(
					username,
					undefined,
					callType,
					sessionSubID,
					ephemeralSubSession
				);

				if (callType === undefined) {
					return;
				}

				this.p2pWebRTCService.disconnect.pipe(take(1)).toPromise().then(async () => {
					if (!this.destroyed) {
						this.router.navigate(
							appointmentID ?
								[accountRoot, 'appointments', appointmentID, 'end'] :
								[accountRoot, 'messages', username]
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
					this.promptFollowup.next(username || this.initiatedUsername);
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
		private readonly accountChatService: AccountChatService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountSessionService */
		public readonly accountSessionService: AccountSessionService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
