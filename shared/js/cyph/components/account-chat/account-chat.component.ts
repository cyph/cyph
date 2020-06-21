/* eslint-disable max-lines */

import {Location} from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	OnInit
} from '@angular/core';
import {ActivatedRoute, Router, UrlSegment} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {UserPresence} from '../../account/enums';
import {BaseProvider} from '../../base-provider';
import {States, UiStyles} from '../../chat/enums';
import {
	AccountFileRecord,
	AccountUserTypes,
	CallTypes,
	ChatMessageValue,
	IAppointment,
	NotificationTypes
} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountP2PService} from '../../services/account-p2p.service';
import {AccountSessionService} from '../../services/account-session.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {FileTransferService} from '../../services/file-transfer.service';
import {NotificationService} from '../../services/notification.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {SessionInitService} from '../../services/session-init.service';
import {StringsService} from '../../services/strings.service';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {normalize} from '../../util/formatting';
import {lockFunction} from '../../util/lock';
import {debugLogError} from '../../util/log';
import {observableAll} from '../../util/observable-all';
import {getDateTimeString, getTimestamp} from '../../util/time';
import {readableID} from '../../util/uuid';

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
export class AccountChatComponent extends BaseProvider
	implements OnDestroy, OnInit {
	/** @ignore */
	private initiatedAppointmentID?: string;

	/** @ignore */
	private initiatedContactID?: string;

	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** Indicates whether an anonymous chat should be initiated. */
	public readonly anonymousChatInitiating = new BehaviorSubject<boolean>(
		false
	);

	/** Indicates whether this user is the call recipient. */
	public readonly answering = new BehaviorSubject<boolean>(false);

	/** Appointment data, when applicable. */
	public readonly appointment = new BehaviorSubject<
		(IAppointment & {id: string}) | undefined
	>(undefined);

	/** @see AccountCallWaiting.cancelRedirectsHome */
	public readonly cancelRedirectsHome = toBehaviorSubject(
		observableAll([
			this.answering,
			this.accountService.combinedRouteData(this.activatedRoute)
		]).pipe(
			map(
				([answering, [{cancelRedirectsHome}]]) =>
					answering || cancelRedirectsHome === true
			)
		),
		false
	);

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes = ChatMessageValue.Types;

	/** Indicates whether call is pending or not yet loaded. */
	public readonly initialCallPending = this.p2pWebRTCService.initialCallPending.pipe(
		map(
			initialCallPending =>
				initialCallPending && !this.sessionInitService.ephemeral
		)
	);

	/** Initial load screen before a user is set. */
	public readonly initiating = new BehaviorSubject<boolean>(true);

	/** @see ChatMessageValue.Types */
	public readonly messageType = new BehaviorSubject<ChatMessageValue.Types>(
		this.envService.isTelehealth ?
			ChatMessageValue.Types.Quill :
			ChatMessageValue.Types.Text
	);

	/** @see ChatMessageList.promptFollowup */
	public readonly promptFollowup = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** Sub-session ID. */
	public readonly sessionSubID = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** @see States */
	public readonly states = States;

	/** @see UiStyles */
	public readonly uiStyles = UiStyles;

	/** @see UserPresence */
	public readonly userPresence = UserPresence;

	/** @ignore */
	private async navigate (...url: string[]) : Promise<void> {
		this.destroyed.next(true);
		await this.router.navigate(['transition'], {skipLocationChange: true});
		await this.router.navigate(['', ...url]);
	}

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		super.ngOnDestroy();

		if (this.p2pWebRTCService.isActive.value) {
			await this.p2pWebRTCService.close();
		}

		await this.accountSessionService.destroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();

		const lock = lockFunction();

		let messageBottomOffsetData:
			| {contactID: string; path: string}
			| undefined;

		this.subscriptions.push(
			this.accountService
				.combinedRouteData(this.activatedRoute)
				.subscribe(
					async ([
						{
							callType,
							defaultMessageBottomOffset,
							defaultSessionSubID,
							ephemeralSubSession,
							generateAnonymousChannelID,
							promptFollowup
						},
						{
							anonymousChannelID,
							answerExpireTime,
							appointmentID,
							contactID,
							messageBottomOffset,
							sessionSubID,
							username
						},
						[{path}]
					]: [
						{
							callType?: 'audio' | 'video';
							defaultMessageBottomOffset?: number;
							defaultSessionSubID?: string;
							ephemeralSubSession?: boolean;
							externalUser?: boolean;
							generateAnonymousChannelID?: boolean;
							promptFollowup?: boolean;
						},
						{
							anonymousChannelID?: string;
							answerExpireTime?: number;
							appointmentID?: string;
							contactID?: string;
							messageBottomOffset?: string;
							sessionSubID?: string;
							username?: string;
						},
						UrlSegment[]
					]) =>
						/* eslint-disable-next-line complexity */
						lock(async () => {
							if (this.destroyed.value) {
								return;
							}

							if (
								!anonymousChannelID &&
								generateAnonymousChannelID
							) {
								anonymousChannelID = readableID(
									this.configService.cyphIDLength
								);
							}

							this.answering.next(answerExpireTime !== undefined);
							this.anonymousChatInitiating.next(
								!!anonymousChannelID
							);

							try {
								if (username) {
									this.router.navigate(
										[
											path,
											await this.accountContactsService.getContactID(
												username
											)
										],
										{replaceUrl: true}
									);
									return;
								}

								if (
									contactID &&
									defaultMessageBottomOffset !== undefined
								) {
									this.router.navigate(
										[
											path,
											contactID,
											defaultMessageBottomOffset
										],
										{replaceUrl: true}
									);
									return;
								}

								if (contactID && messageBottomOffset) {
									const newMessageBottomOffset = parseFloat(
										messageBottomOffset
									);

									if (!isNaN(newMessageBottomOffset)) {
										messageBottomOffsetData = {
											contactID,
											path
										};

										if (
											newMessageBottomOffset !==
											this.accountChatService
												.messageBottomOffset.value
										) {
											this.accountChatService.messageBottomOffset.next(
												newMessageBottomOffset
											);
										}
									}
								}
								else {
									messageBottomOffsetData = undefined;
								}

								if (this.initiatedAppointmentID) {
									if (
										appointmentID &&
										this.initiatedAppointmentID !==
											appointmentID
									) {
										await this.navigate(
											'appointments',
											path,
											appointmentID
										);
									}

									return;
								}

								if (this.initiatedContactID) {
									if (
										contactID &&
										this.initiatedContactID !== contactID
									) {
										await this.navigate(path, contactID);
									}

									return;
								}

								let appointment: IAppointment & {id: string};
								let appointmentOther: string | undefined;

								if (appointmentID) {
									appointment = {
										id: appointmentID,
										...(await this.accountFilesService.downloadFile(
											appointmentID,
											AccountFileRecord.RecordTypes
												.Appointment
										).result)
									};

									callType = promptFollowup ?
										undefined :
									appointment.calendarInvite.callType ===
									CallTypes.Video ?
										'video' :
									appointment.calendarInvite.callType ===
										CallTypes.Audio ?
										'audio' :
										undefined;

									sessionSubID = appointmentID;

									appointmentOther =
										appointment.participants === undefined ?
											undefined :
											appointment.participants.find(
												participant =>
													this.accountDatabaseService
														.currentUser.value !==
														undefined &&
													this.accountDatabaseService
														.currentUser.value.user
														.username !==
														normalize(participant)
											);

									contactID = await this.accountContactsService.getContactID(
										appointmentOther
									);

									this.appointment.next(appointment);
								}

								this.initiatedAppointmentID = appointmentID;
								this.initiatedContactID = contactID;

								if (!contactID && !anonymousChannelID) {
									return;
								}

								const callEndRoute = appointmentID ?
									['appointments', appointmentID, 'end'] :
								!this.cancelRedirectsHome.value ?
									['messages', contactID] :
									[''];

								if (
									answerExpireTime !== undefined &&
									(await getTimestamp()) > answerExpireTime
								) {
									this.dialogService.toast(
										this.stringsService.p2pTimeoutIncoming,
										3000
									);
									this.router.navigate(callEndRoute);
									return;
								}

								if (defaultSessionSubID && !sessionSubID) {
									sessionSubID = defaultSessionSubID;
								}

								const chat = anonymousChannelID ?
									{
										anonymousChannelID,
										passive: !generateAnonymousChannelID
									} :
									await this.accountContactsService.getChatData(
										contactID
									);

								this.messageType.next(
									sessionSubID === 'mail' ||
										this.envService.isTelehealth ||
										('username' in chat &&
											!(await this.accountContactsService.isContact(
												chat.username,
												true
											))) ?
										ChatMessageValue.Types.Quill :
										ChatMessageValue.Types.Text
								);

								this.sessionSubID.next(sessionSubID);

								this.p2pWebRTCService.initialCallPending.next(
									callType !== undefined
								);

								const destroyed = this.destroyed
									.pipe(
										filter(b => b),
										take(1)
									)
									.toPromise();

								if (anonymousChannelID) {
									beforeUnloadMessage = this.stringsService
										.disconnectWarning;

									destroyed.then(() => {
										beforeUnloadMessage = undefined;
									});
								}

								if (
									callType !== undefined &&
									anonymousChannelID
								) {
									return this.accountChatService.setUser(
										chat,
										undefined,
										callType
									);
								}
								if (callType !== undefined && !sessionSubID) {
									await this.accountChatService.setUser(chat);
									return this.accountP2PService.beginCall(
										callType,
										path
									);
								}

								this.initiating.next(false);
								await this.accountChatService.setUser(
									chat,
									undefined,
									callType,
									sessionSubID,
									ephemeralSubSession
								);

								if (callType === undefined) {
									return;
								}

								this.accountService.isCallActive.next(true);

								if (
									!(await (this.answering.value ?
										this.accountP2PService.handlers.acceptConfirm(
											callType
										) :
										this.accountP2PService.handlers.requestConfirm(
											callType
										)))
								) {
									this.router.navigate(callEndRoute);
									return;
								}

								if (!this.accountSessionService.group) {
									this.notificationService
										.ring(
											async () =>
												Promise.race([
													this.p2pWebRTCService.loading
														.pipe(
															filter(b => !b),
															take(1)
														)
														.toPromise(),
													destroyed.then(() => false)
												]),
											true
										)
										.then(async () => {
											const remoteUser = await this
												.accountSessionService
												.remoteUser;

											if (
												this.destroyed.value ||
												this.accountSessionService.state
													.isConnected.value
											) {
												return;
											}

											await Promise.all([
												sessionSubID &&
												remoteUser &&
												!remoteUser.anonymous ?
													this.accountDatabaseService.notify(
														remoteUser.username,
														NotificationTypes.Call,
														{
															callType,
															id: sessionSubID,
															missed: true
														}
													) :
													undefined,
												this.dialogService.toast(
													this.stringsService
														.p2pTimeoutOutgoing,
													3000
												),
												this.p2pWebRTCService.close()
											]);
										});
								}

								this.p2pWebRTCService.disconnect
									.pipe(take(1))
									.toPromise()
									.then(async () => {
										if (this.destroyed.value) {
											return;
										}

										this.router.navigate(callEndRoute);

										if (!(appointment && appointmentID)) {
											return;
										}

										appointment.occurred = true;

										await this.accountFilesService.updateAppointment(
											appointmentID,
											appointment,
											undefined,
											true
										);

										if (
											!(
												appointment.notes &&
												appointmentOther
											)
										) {
											return;
										}

										await this.accountFilesService.upload(
											`Notes about ${appointmentOther} (${
												appointment.calendarInvite.title
											}, ${getDateTimeString(
												appointment.calendarInvite
													.startTime
											)})`,
											appointment.notes
										).result;
									});
							}
							catch (err) {
								debugLogError(() => ({
									accountChatInitError: err
								}));
								this.router.navigate(['profile', '404']);
							}
							finally {
								if (promptFollowup) {
									this.promptFollowup.next(
										contactID || this.initiatedContactID
									);
								}
								else {
									this.promptFollowup.next(undefined);
								}
							}
						})
				)
		);

		this.subscriptions.push(
			this.accountChatService.messageBottomOffset.subscribe(
				async messageBottomOffsetChange => {
					if (!messageBottomOffsetData) {
						return;
					}

					const {contactID, path} = messageBottomOffsetData;

					this.location.replaceState(
						[path, contactID, messageBottomOffsetChange].join('/')
					);
				}
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly location: Location,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly notificationService: NotificationService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService,

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

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileTransferService */
		public readonly fileTransferService: FileTransferService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
