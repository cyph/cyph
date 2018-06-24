import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {ISessionMessageData, rpcEvents} from '../session';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionService} from './account-session.service';
import {ChatService} from './chat.service';
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
		if (!this.accountSessionService.remoteUser.value) {
			return;
		}

		/* Workaround for "Form submission canceled because the form is not connected" warning */
		await sleep(0);

		const id		= uuid();
		const contactID	= await this.accountContactsService.getContactID(
			this.accountSessionService.remoteUser.value.username
		);

		await (await this.accountSessionService.send([
			rpcEvents.accountP2P,
			{command: {
				additionalData: id,
				method: callType
			}}
		])).confirmPromise;

		await this.accountSessionService.remoteUser.value.accountUserProfile.getValue().then(
			async ({realUsername}) => this.chatService.addMessage({
				value: `${this.stringsService.youInvited} ${realUsername} ${
					this.stringsService.toA
				} ${
					callType === 'video' ?
						this.stringsService.videoCall :
						this.stringsService.audioCall
				}.`
			})
		);

		await this.router.navigate([accountRoot, callType, contactID, id]);
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

					const id				= o.command.additionalData;
					const callType			= o.command.method;
					const contactID			= await this.accountContactsService.getContactID(
						this.accountSessionService.remoteUser.value.username
					);
					const {realUsername}	= await this.accountSessionService.remoteUser.value.
						accountUserProfile.
						getValue()
					;

					this.chatService.addMessage({
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
