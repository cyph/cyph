import {Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {eventManager} from '../event-manager';
import {ISessionService} from '../service-interfaces/isession-service';
import {Events, events, RpcEvents, rpcEvents, Users, users} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ISession} from '../session/isession';
import {ProFeatures} from '../session/profeatures';
import {Thread} from '../thread';
import {util} from '../util';
import {AbstractSessionInitService} from './abstract-session-init.service';
import {ConfigService} from './config.service';


/**
 * Manages a session in a separate thread.
 */
@Injectable()
export class SessionService implements ISessionService {
	/** @ignore */
	private readonly thread: Thread;

	/** @ignore */
	private readonly eventId: string			= util.generateGuid();

	/** @ignore */
	private readonly wasInitiatedByAPI: boolean	=
		this.abstractSessionInitService.id.length > this.configService.secretLength
	;

	/** @ignore */
	private readonly threadEvents		= {
		close: 'close-SessionService',
		send: 'send-SessionService'
	};

	/** @inheritDoc */
	public readonly apiFlags	= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false,
		telehealth: false
	};

	/** @inheritDoc */
	public readonly state		= {
		cyphId: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: false,
		wasInitiatedByAPI: false
	};

	/** @inheritDoc */
	public readonly events: Events			= events;

	/** @inheritDoc */
	public readonly rpcEvents: RpcEvents	= rpcEvents;

	/** @inheritDoc */
	public readonly users: Users			= users;

	/** @inheritDoc */
	public close () : void {
		this.trigger(this.threadEvents.close);
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off<T>(event + this.eventId, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on<T>(event + this.eventId, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.eventId);
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures(
			this.wasInitiatedByAPI,
			this.apiFlags.forceTURN,
			this.apiFlags.modestBranding,
			this.apiFlags.nativeCrypto,
			this.apiFlags.telehealth,
			this.abstractSessionInitService.callType === 'video',
			this.abstractSessionInitService.callType === 'audio'
		);
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		this.trigger(this.threadEvents.send, {messages});
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.eventId, data);
	}

	constructor (
		/** @ignore */
		private readonly abstractSessionInitService: AbstractSessionInitService,

		/** @ignore */
		private readonly configService: ConfigService
	) {
		let id	= this.abstractSessionInitService.id;

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
