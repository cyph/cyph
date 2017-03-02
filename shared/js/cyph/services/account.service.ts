import {Injectable} from '@angular/core';
import {States} from '../account/enums';


/**
 * Account service.
 */
@Injectable()
export class AccountService {
	/** Username of user whose chat is open. */
	public chatUsername: string|undefined;

	/** Username of user whose profile is being viewed. */
	public profileUsername: string|undefined;

	/** @see States */
	public state: States|undefined;

	/** Opens chat with contact. */
	public openChat (username: string) : void {
		this.chatUsername	= username;
		this.state			= States.chat;
	}

	/** Opens chat with contact. */
	public openProfile (username: string) : void {
		this.profileUsername	= username;
		this.state				= States.profile;
	}

	constructor () {}
}
