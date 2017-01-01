import {Injectable} from '@angular/core';
import {IMessage} from '../cyph/session/imessage';
import {ISession} from '../cyph/session/isession';
import {SessionService} from '../cyph/ui/services/session.service';
import {util} from '../cyph/util';


/**
 * Mocks session service and communicates locally.
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
	private async getSession () : Promise<ISession> {
		return util.waitForValue(() => this.session);
	}

	/** @inheritDoc */
	public async close () : Promise<void> {
		(await this.getSession()).close();
	}

	/** @inheritDoc */
	public async off<T> (event: string, handler: (data: T) => void) : Promise<void> {
		(await this.getSession()).off<T>(event, handler);
	}

	/** @inheritDoc */
	public async on<T> (event: string, handler: (data: T) => void) : Promise<void> {
		(await this.getSession()).on<T>(event, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return (await this.getSession()).one<T>(event);
	}

	/** @inheritDoc */
	public async receive (data: string) : Promise<void> {
		(await this.getSession()).receive(data);
	}

	/** @inheritDoc */
	public async send (...messages: IMessage[]) : Promise<void> {
		(await this.getSession()).send(...messages);
	}

	/** @inheritDoc */
	public async sendText (text: string, selfDestructTimeout?: number) : Promise<void> {
		(await this.getSession()).sendText(text, selfDestructTimeout);
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
		return this.session ? this.session.state : {
			cyphId: '',
			isAlice: false,
			isAlive: false,
			isStartingNewCyph: false,
			sharedSecret: '',
			wasInitiatedByAPI: false
		};
	}

	/** @inheritDoc */
	public async trigger (event: string, data?: any) : Promise<void> {
		(await this.getSession()).trigger(event, data);
	}

	/** @inheritDoc */
	public async updateState (key: string, value: any) : Promise<void> {
		(await this.getSession()).updateState(key, value);
	}

	constructor () {}
}
