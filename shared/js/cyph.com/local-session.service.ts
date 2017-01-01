import {Injectable} from '@angular/core';
import {IMessage} from '../cyph/session/imessage';
import {ISession} from '../cyph/session/isession';
import {SessionService} from '../cyph/ui/services/session.service';


/**
 * Manages a session.
 */
@Injectable()
export class LocalSessionService implements SessionService {
	/** @inheritDoc */
	public session: ISession;

	/** @inheritDoc */
	public readonly apiFlags	= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false
	};

	/** @ignore */
	private getSession () : ISession {
		if (!this.session) {
			throw new Error('Session not set.');
		}

		return this.session;
	}

	/** @inheritDoc */
	public close () : void {
		this.getSession().close();
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		this.getSession().off<T>(event, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		this.getSession().on<T>(event, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return this.getSession().one<T>(event);
	}

	/** @inheritDoc */
	public async receive (data: string) : Promise<void> {
		return this.getSession().receive(data);
	}

	/** @inheritDoc */
	public async send (...messages: IMessage[]) : Promise<void> {
		return this.getSession().send(...messages);
	}

	/** @inheritDoc */
	public sendText (text: string, selfDestructTimeout?: number) : void {
		this.getSession().sendText(text, selfDestructTimeout);
	}

	/** @inheritDoc */
	public get state () : {
		cyphId: string;
		isAlice: boolean;
		isAlive: boolean;
		isStartingNewCyph: boolean;
		sharedSecret: string;
		wasInitiatedByAPI: boolean;
	} {
		try {
			return this.getSession().state;
		}
		catch (_) {
			return {
				cyphId: '',
				isAlice: false,
				isAlive: false,
				isStartingNewCyph: false,
				sharedSecret: '',
				wasInitiatedByAPI: false
			};
		}
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		this.getSession().trigger(event, data);
	}

	/** @inheritDoc */
	public updateState (key: string, value: any) : void {
		this.getSession().updateState(key, value);
	}

	constructor () {}
}
