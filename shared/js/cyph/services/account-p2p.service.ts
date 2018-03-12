import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {ISessionMessageData, rpcEvents} from '../session';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountSessionService} from './account-session.service';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
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
	private getCallURL (callType: 'audio'|'video', username: string, id: string) : string {
		return `#${accountRoot}${accountRoot === '' ? '' : '/'}${callType}/${username}/${id}`;
	}

	/** @ignore */
	protected async request (callType: 'audio'|'video') : Promise<void> {
		if (!this.accountSessionService.remoteUser.value) {
			return;
		}

		/* Workaround for "Form submission canceled because the form is not connected" warning */
		await sleep(0);

		const id		= uuid();
		const username	= this.accountSessionService.remoteUser.value.username;

		await this.accountSessionService.sendAndAwaitConfirmation([
			rpcEvents.accountP2P,
			{command: {
				additionalData: id,
				method: callType
			}}
		]);

		await this.accountSessionService.remoteUser.value.accountUserProfile.getValue().then(
			async ({realUsername}) => this.chatService.addMessage(
				`${this.stringsService.youInvited} ${realUsername} ${
					this.stringsService.toA
				} ${
					callType === 'video' ?
						this.stringsService.videoCall :
						this.stringsService.audioCall
				}.`
			)
		);

		await this.router.navigate([accountRoot, callType, username, id]);
	}

	constructor (
		chatService: ChatService,
		dialogService: DialogService,
		p2pWebRTCService: P2PWebRTCService,
		sessionCapabilitiesService: SessionCapabilitiesService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(
			chatService,
			dialogService,
			p2pWebRTCService,
			sessionCapabilitiesService,
			sessionInitService,
			stringsService
		);

		this.accountSessionService.on(rpcEvents.accountP2P, async (o: ISessionMessageData) => {
			if (!(
				o.command &&
				o.command.additionalData &&
				(o.command.method === 'audio' || o.command.method === 'video') &&
				this.accountSessionService.remoteUser.value
			)) {
				return;
			}

			const id				= o.command.additionalData;
			const callType			= o.command.method;
			const username			= this.accountSessionService.remoteUser.value.username;
			const {realUsername}	= await this.accountSessionService.remoteUser.value.
				accountUserProfile.
				getValue()
			;

			this.chatService.addMessage(
				`${realUsername} ${this.stringsService.hasInvitedYouToA} ${
					callType === 'video' ?
						this.stringsService.videoCall :
						this.stringsService.audioCall
				}. [${this.stringsService.clickHere}](${
					this.getCallURL(callType, username, id)
				}) ${this.stringsService.toJoin}.`
			);
		});
	}
}
