import {Injectable} from '@angular/core';


/**
 * Angular service that does $BALLS.
 */
@Injectable()
export class ChatService {
	/** @ignore */
	public abortSetup () : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public async addMessage (
		_TEXT: string,
		_AUTHOR: string,
		_TIMESTAMP?: number,
		_SHOULD_NOTIFY?: boolean,
		_SELF_DESTRUCT_TIMEOUT?: number
	) : Promise<void> {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public async disconnectButton () : Promise<void> {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public helpButton () : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public messageChange () : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public send (_MESSAGE?: string, _SELF_DESTRUCT_TIMEOUT?: number) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public setFriendTyping (_IS_FRIEND_TYPING: boolean) : void {
		throw new Error('Not implemented.');
	}

	/** @ignore */
	public setQueuedMessage (_MESSAGE_TEXT?: string, _SELF_DESTRUCT?: boolean) : void {
		throw new Error('Not implemented.');
	}

	constructor () {}
}
