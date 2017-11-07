import {Injectable} from '@angular/core';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {LockFunction} from '../cyph/lock-function-type';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {EnvService} from '../cyph/services/env.service';
import {ErrorService} from '../cyph/services/error.service';
import {SessionService} from '../cyph/services/session.service';
import {StringsService} from '../cyph/services/strings.service';
import {
	events,
	ISessionMessageAdditionalData,
	ISessionMessageData,
	rpcEvents
} from '../cyph/session';
import * as util from '../cyph/util';
import {ISessionMessage} from '../proto';
import {ChatData} from './chat-data';


/**
 * Mocks session service and communicates locally.
 */
@Injectable()
export class LocalSessionService extends SessionService {
	/** @ignore */
	private chatData?: ChatData;

	/** @ignore */
	private readonly localLock: LockFunction	= util.lockFunction();

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
			(message: ISessionMessage&{data: ISessionMessageData}) => {
				if (!message.event) {
					return;
				}

				(<any> message.data).author	= this.remoteUsername;

				if (message.event === events.cyphertext) {
					this.trigger(events.cyphertext, {
						author: message.data.author,
						cyphertext: message.data.bytes || new Uint8Array(0)
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
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		return this.localLock(f, reason);
	}

	/** @inheritDoc */
	public async send (
		...messages: [string, ISessionMessageAdditionalData][]
	) : Promise<(ISessionMessage&{data: ISessionMessageData})[]> {
		while (!this.chatData) {
			await util.sleep();
		}

		const newMessages	= await this.newMessages(messages);

		for (const message of newMessages) {
			const cyphertext	= potassiumUtil.randomBytes(util.random(1024, 100));

			this.trigger(events.cyphertext, {
				author: this.localUsername,
				cyphertext
			});

			this.chatData.channelOutgoing.next(
				(await this.newMessages([[events.cyphertext, {bytes: cyphertext}]]))[0]
			);
			this.chatData.channelOutgoing.next(message);
		}

		return newMessages;
	}

	constructor (
		analyticsService: AnalyticsService,
		errorService: ErrorService,
		stringsService: StringsService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		super(
			analyticsService,
			<any> undefined,
			<any> undefined,
			errorService,
			<any> undefined,
			stringsService
		);
	}
}
