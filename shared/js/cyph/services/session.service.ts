import {eventManager} from '../event-manager';
import {ISessionService} from '../service-interfaces/isession.service';
import {Events, events, RpcEvents, rpcEvents, Users, users} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';


/**
 * Manages a session.
 */
export abstract class SessionService implements ISessionService {
	/** @ignore */
	protected readonly eventId: string	= util.generateGuid();

	/** @inheritDoc */
	public readonly apiFlags	= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false,
		telehealth: false
	};

	/** @inheritDoc */
	public readonly events: Events			= events;

	/** @inheritDoc */
	public readonly rpcEvents: RpcEvents	= rpcEvents;

	/** @inheritDoc */
	public readonly state	= {
		cyphId: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: false,
		wasInitiatedByAPI: false
	};

	/** @inheritDoc */
	public readonly proFeatures: ProFeatures	= new ProFeatures();

	/** @inheritDoc */
	public readonly users: Users				= users;

	/** @inheritDoc */
	public close () : void {
		throw new Error('Must provide an implementation of SessionService.close.');
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
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.eventId, data);
	}

	/** @inheritDoc */
	public send (..._MESSAGES: IMessage[]) : void {
		throw new Error('Must provide an implementation of SessionService.send.');
	}

	constructor () {}
}
