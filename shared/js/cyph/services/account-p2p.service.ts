import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {NotificationTypes} from '../proto';
import {ISessionMessageData, rpcEvents} from '../session';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionService} from './account-session.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {P2PService} from './p2p.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';


/**
 * Angular service for account P2P.
 */
@Injectable()
export class AccountP2PService extends P2PService {
	/** @ignore */
	private getCallURL (callType: 'audio'|'video', contactID: string, id: string) : string {
		return `#${accountRoot}${accountRoot === '' ? '' : '/'}${callType}/${contactID}/${id}`;
	}

	/** @ignore */
	protected async request (callType: 'audio'|'video') : Promise<void> {
		if (
			!this.accountSessionService.remoteUser.value ||
			!(await this.handlers.requestConfirm(callType, false))
		) {
			return;
		}

		/* Workaround for "Form submission canceled because the form is not connected" warning */
		await sleep(0);

		await this.router.navigate([
			accountRoot,
			callType,
			await this.accountSessionService.remoteUser.value.contactID
		]);
	}

	/** Initiates call. */
	public async beginCall (callType: 'audio'|'video', route: string = callType) : Promise<void> {
		if (!this.accountSessionService.remoteUser.value) {
			return;
		}

		const id		= uuid();
		const messageID	= uuid();
		const username	= this.accountSessionService.remoteUser.value.username;
		const contactID	= await this.accountSessionService.remoteUser.value.contactID;

		await (await this.accountSessionService.send([
			rpcEvents.accountP2P,
			{command: {
				additionalData: `${id}\n${messageID}`,
				method: callType
			}}
		])).confirmPromise;

		await Promise.all([
			this.accountSessionService.remoteUser.value.accountUserProfile.getValue().then(
				async ({realUsername}) => this.chatService.addMessage({
					value: `${this.stringsService.youInvited} ${realUsername} ${
						this.stringsService.toA
					} ${
						callType === 'video' ?
							this.stringsService.videoCall :
							this.stringsService.audioCall
					}.`
				})
			),
			this.accountContactsService.getCastleSessionID(username).then(async castleSessionID =>
				this.accountDatabaseService.notify(
					username,
					NotificationTypes.Message,
					{castleSessionID, id: messageID}
				)
			)
		]);

		await this.router.navigate([accountRoot, route, contactID, id]);
	}

	/** @inheritDoc */
	public async closeButton (cancelRedirectsHome: boolean = false) : Promise<void> {
		const [contactID]	= await Promise.all([
			this.accountSessionService.remoteUser.value ?
				this.accountSessionService.remoteUser.value.contactID :
				Promise.resolve(undefined)
			,
			super.closeButton()
		]);

		if (!contactID) {
			return;
		}

		if (cancelRedirectsHome) {
			await this.router.navigate([accountRoot]);
		}
		else {
			await this.router.navigate([accountRoot, 'messages', contactID]);
		}
	}

	constructor (
		chatService: ChatService,
		dialogService: DialogService,
		envService: EnvService,
		p2pWebRTCService: P2PWebRTCService,
		sessionCapabilitiesService: SessionCapabilitiesService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(
			chatService,
			dialogService,
			envService,
			p2pWebRTCService,
			sessionCapabilitiesService,
			sessionInitService,
			stringsService
		);

		this.accountSessionService.on(
			rpcEvents.accountP2P,
			async (newEvents: ISessionMessageData[]) => {
				for (const o of newEvents) {
					if (!(
						o.command &&
						o.command.additionalData &&
						(o.command.method === 'audio' || o.command.method === 'video') &&
						this.accountSessionService.remoteUser.value
					)) {
						continue;
					}

					const [id, messageID]	= (o.command.additionalData || '').split('\n');
					const callType			= o.command.method;

					const [contactID, {realUsername}]	= await Promise.all([
						this.accountSessionService.remoteUser.value.contactID,
						this.accountSessionService.remoteUser.value.accountUserProfile.getValue()
					]);

					this.chatService.addMessage({
						id: messageID,
						value: `${realUsername} ${this.stringsService.hasInvitedYouToA} ${
							callType === 'video' ?
								this.stringsService.videoCall :
								this.stringsService.audioCall
						}. [${this.stringsService.clickHere}](${
							this.getCallURL(callType, contactID, id)
						}) ${this.stringsService.toJoin}.`
					});
				}
			}
		);
	}
}
