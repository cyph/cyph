import {Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {ISessionService} from '../service-interfaces/isession-service';
import {IMessage} from '../session/imessage';
import {ISession} from '../session/isession';
import {ProFeatures} from '../session/profeatures';
import {Thread} from '../thread';
import {ConfigService} from './config.service';
import {SessionInitService} from './session-init.service';


/**
 * Manages a session in a separate thread.
 */
@Injectable()
export class SessionService extends ISessionService {
	/** @ignore */
	private readonly thread: Thread;

	/** @ignore */
	private readonly threadEvents	= {
		close: 'close-SessionService',
		send: 'send-SessionService'
	};

	/** @ignore */
	private readonly wasInitiatedByAPI: boolean	=
		this.sessionInitService.id.length > this.configService.secretLength
	;

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures(
			this.wasInitiatedByAPI,
			this.apiFlags.forceTURN,
			this.apiFlags.modestBranding,
			this.apiFlags.nativeCrypto,
			this.apiFlags.telehealth,
			this.sessionInitService.callType === 'video',
			this.sessionInitService.callType === 'audio'
		);
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		this.trigger(this.threadEvents.send, {messages});
	}

	constructor (
		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService
	) {
		super();

		let id	= this.sessionInitService.id;

		/* API flags */
		for (const flag of this.configService.apiFlags) {
			if (id[0] !== flag.character) {
				continue;
			}

			id	= id.substring(1);

			flag.set(this);

			analytics.sendEvent({
				eventAction: 'used',
				eventCategory: flag.analEvent,
				eventValue: 1,
				hitType: 'event'
			});
		}

		this.on(this.events.threadUpdate, (e: {
			key: 'cyphId'|'isAlice'|'isAlive'|'sharedSecret'|'startingNewCyph'|'wasInitiatedByAPI';
			value: boolean|string|undefined;
		}) => {
			if (
				(e.key === 'cyphId' && typeof e.value === 'string') ||
				(e.key === 'isAlice' && typeof e.value === 'boolean') ||
				(e.key === 'isAlive' && typeof e.value === 'boolean') ||
				(e.key === 'sharedSecret' && typeof e.value === 'string') ||
				(
					e.key === 'startingNewCyph' &&
					(typeof e.value === 'boolean' || typeof e.value === 'undefined')
				) ||
				(e.key === 'wasInitiatedByAPI' && typeof e.value === 'boolean')
			) {
				/* Casting to any as a temporary workaround pending TypeScript fix */
				(<any> this).state[e.key]	= e.value;
			}
			else {
				throw new Error('Invalid value.');
			}
		});

		this.thread	= new Thread(
			/* tslint:disable-next-line:only-arrow-functions */
			function (
				/* tslint:disable-next-line:variable-name */
				Session: any,
				locals: any,
				importScripts: Function
			) : void {
				importScripts('/js/cyph/session/session.js');

				const session: ISession	= new Session(
					locals.id,
					locals.proFeatures,
					locals.eventId
				);

				session.on(locals.events.close, () => {
					session.close();
				});

				session.on(locals.events.send, (e: {messages: IMessage[]}) => {
					session.send(...e.messages);
				});
			},
			{
				id,
				eventId: this.eventId,
				events: this.threadEvents,
				proFeatures: this.proFeatures
			}
		);
	}
}
