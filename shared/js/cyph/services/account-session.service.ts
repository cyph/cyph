import {Injectable} from '@angular/core';
import {User} from '../account/user';
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
	private static DUMMY_REPLIES: string[]	= [
		'who is this?',
		'oh...'
	];

	/** Temporary, for testing. */
	private readonly replies	= new Map<string, number>();

	/** The remote user we're chatting with. */
	public user: User|undefined;

	/** Closes a chat with an anonymous user. Otherwise, this is a no-op. */
	public close () : void {}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		for (const message of messages) {
			if (message.event !== this.rpcEvents.text) {
				continue;
			}

			this.trigger(this.rpcEvents.text, message.data);

			if (!this.user) {
				continue;
			}

			const user	= this.user;
			const reply	= this.replies.get(user.username) || 0;
			this.replies.set(user.username, reply + 1);

			if (reply >= AccountSessionService.DUMMY_REPLIES.length) {
				continue;
			}

			util.lock(user, async () => {
				await util.sleep(util.random(1000));
				await util.waitUntilTrue(() => user === this.user);
				this.trigger(this.rpcEvents.typing, {isTyping: true});
				await util.sleep(util.random(2000, 500));
				this.trigger(this.rpcEvents.typing, {isTyping: false});
				await util.waitUntilTrue(() => user === this.user);
				await util.sleep(1000);
				await util.waitUntilTrue(() => user === this.user);

				this.trigger(this.rpcEvents.text, {
					author: user.realUsername,
					text: AccountSessionService.DUMMY_REPLIES[reply]
				});
			});
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
