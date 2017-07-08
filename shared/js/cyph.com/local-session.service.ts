import {Injectable} from '@angular/core';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {EnvService} from '../cyph/services/env.service';
import {ErrorService} from '../cyph/services/error.service';
import {SessionService} from '../cyph/services/session.service';
import {StringsService} from '../cyph/services/strings.service';
import {events, rpcEvents, SessionMessage, users} from '../cyph/session';
import {util} from '../cyph/util';
import {ISessionMessage} from '../proto';
import {ChatData} from './chat-data';


/**
 * Mocks session service and communicates locally.
 */
@Injectable()
export class LocalSessionService extends SessionService {
	/** @ignore */
	private chatData?: ChatData;

	/** @inheritDoc */
	public async close () : Promise<void> {
		while (!this.chatData) {
			await util.sleep();
		}

		if (!this.state.isAlive) {
			return;
		}

		this.state.isAlive	= false;

		this.chatData.channelIncoming.complete();
		this.chatData.channelOutgoing.complete();
		this.trigger(events.closeChat);
	}

	/** Initializes chat data. */
	public async initChatData (chatData: ChatData) : Promise<void> {
		this.chatData		= chatData;
		this.state.isAlice	= this.envService.isMobile;
		this.state.isAlive	= true;

		this.chatData.channelIncoming.subscribe(
			(message: ISessionMessage) => {
				if (!message.event) {
					return;
				}

				message.data.author	= this.stringsService.friend;

				if (message.event === events.cyphertext) {
					this.trigger(events.cyphertext, {
						author: message.data.author,
						cyphertext: potassiumUtil.toBase64(
							message.data.bytes || new Uint8Array([])
						)
					});
				}
				else if (message.event in rpcEvents) {
					this.trigger(message.event, message.data);
				}
			},
			undefined,
			() => { this.close(); }
		);

		await this.chatData.start;

		this.trigger(events.beginChat);
	}

	/** @inheritDoc */
	public async send (...messages: ISessionMessage[]) : Promise<void> {
		while (!this.chatData) {
			await util.sleep();
		}

		for (const message of messages) {
			const cyphertext	= potassiumUtil.randomBytes(util.random(1024, 100));

			this.trigger(events.cyphertext, {author: users.me, cyphertext});

			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}

			this.chatData.channelOutgoing.next(
				new SessionMessage(events.cyphertext, {bytes: cyphertext})
			);
			this.chatData.channelOutgoing.next(message);
		}
	}

	constructor (
		analyticsService: AnalyticsService,

		errorService: ErrorService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super(analyticsService, errorService);
	}
}
