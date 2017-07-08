import {Injectable} from '@angular/core';
import {ISessionMessage} from '../../proto';
import {User} from '../account/user';
import {rpcEvents} from '../session/enums';
import {util} from '../util';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AnalyticsService} from './analytics.service';
import {ErrorService} from './error.service';
import {SessionService} from './session.service';


/**
 * Account session service.
 */
@Injectable()
export class AccountSessionService extends SessionService {
	/** Temporary, for testing. */
	private readonly DUMMY_REPLIES: string[]	= [
		'Hey, how\'s it going?',
		'Same old, same old. Still on the run from the NSA.'
	];

	/** Temporary, for testing. */
	private readonly replies	= new Map<string, number>();

	/** The remote user we're chatting with. */
	public user?: User;

	/** Closes a chat with an anonymous user. Otherwise, this is a no-op. */
	public close () : void {}

	/** @inheritDoc */
	public send (...messages: ISessionMessage[]) : void {
		for (const message of messages) {
			if (message.event !== rpcEvents.text) {
				continue;
			}

			this.trigger(rpcEvents.text, message.data);

			if (!this.user) {
				continue;
			}

			const user	= this.user;
			const reply	= this.replies.get(user.username) || 0;
			this.replies.set(user.username, reply + 1);

			if (reply >= this.DUMMY_REPLIES.length) {
				continue;
			}

			util.lock(<any> user, async () => {
				await util.sleep(util.random(1000));
				await util.waitUntilTrue(() => user === this.user);
				this.trigger(rpcEvents.typing, {isTyping: true});
				await util.sleep(util.random(2000, 500));
				this.trigger(rpcEvents.typing, {isTyping: false});
				await util.waitUntilTrue(() => user === this.user);
				await util.sleep(1000);
				await util.waitUntilTrue(() => user === this.user);

				this.trigger(rpcEvents.text, {
					author: user.realUsername,
					text: this.DUMMY_REPLIES[reply]
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
		analyticsService: AnalyticsService,
		errorService: ErrorService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {
		super(analyticsService, errorService);
	}
}
