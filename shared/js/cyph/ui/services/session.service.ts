import {Injectable} from '@angular/core';
import {IMessage} from '../../session/imessage';


/**
 * Angular service that does $BALLS.
 */
@Injectable()
export class SessionService {
	/** @ignore */
	public readonly state	= {
		cyphId: <string> '',
		isAlice: <boolean> false,
		isAlive: <boolean> true,
		isStartingNewCyph: <boolean> false,
		sharedSecret: <string> '',
		wasInitiatedByAPI: <boolean> false
	};

	/** @ignore */
	public close () : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public off<T> (_EVENT: string, _HANDLER: (data: T) => void) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public on<T> (_EVENT: string, _HANDLER: (data: T) => void) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public async one<T> (_EVENT: string) : Promise<T> {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public async receive (_DATA: string) : Promise<void> {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public send (..._MESSAGES: IMessage[]) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public async sendBase (_MESSAGES: IMessage[]) : Promise<void> {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public sendText (_TEXT: string, _SELF_DESTRUCT_TIMEOUT?: number) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public trigger (_EVENT: string, _DATA?: any) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public updateState (_KEY: string, _VALUE: any) : void {
		throw new Error('Not implemented.');
	}

	constructor () {}
}
