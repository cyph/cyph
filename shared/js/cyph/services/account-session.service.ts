import {Injectable} from '@angular/core';
import {IUser} from '../account/iuser';
import {IMessage} from '../session/imessage';
import {util} from '../util';
import {AccountUserLookupService} from './account-user-lookup.service';
import {SessionService} from './session.service';


/**
 * Account session service.
 */
@Injectable()
export class AccountSessionService extends SessionService {
	/** Temporary, for testing. */
	private readonly replies	= new Set<string>();

	/** The remote user we're chatting with. */
	public user: IUser|undefined;

	/** Closes a chat with an anonymous user. Otherwise, this is a no-op. */
	public close () : void {}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		for (const message of messages) {
			if (message.event !== this.rpcEvents.text) {
				continue;
			}

			this.trigger(this.rpcEvents.text, message.data);

			if (util.random(7) !== 0) {
				continue;
			}

			(async () => {
				if (!this.user || this.replies.has(this.user.username)) {
					return;
				}

				this.replies.add(this.user.username);
				await util.sleep(util.random(10000, 3000));
				this.trigger(this.rpcEvents.typing, {isTyping: true});
				await util.sleep(util.random(4000, 1000));
				this.trigger(this.rpcEvents.typing, {isTyping: false});

				this.trigger(this.rpcEvents.text, {
					author: this.user.username,
					text: 'who is this?'
				});
			})();
		}
	}

	/** Sets the remote user we're chatting with. */
	public async setUser (username: string) : Promise<void> {
		if (this.user && username === this.user.username) {
			return;
		}

		this.user	= await this.accountUserLookupService.getUser(username);
	}

	constructor (
		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {
		super();
	}
}
