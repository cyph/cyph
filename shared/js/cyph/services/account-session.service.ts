import {Injectable} from '@angular/core';
import {IUser} from '../account/iuser';
import {eventManager} from '../event-manager';
import {ISessionService} from '../service-interfaces/isession-service';
import {Events, events, RpcEvents, rpcEvents, Users, users} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AccountUserLookupService} from './account-user-lookup.service';


/**
 * Account session service.
 */
@Injectable()
export class AccountSessionService implements ISessionService {
	/** @ignore */
	private readonly id: string	= util.generateGuid();

	/** Temporary, for testing. */
	private readonly replies	= new Set<string>();

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
		isAlice: true,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: false,
		wasInitiatedByAPI: false
	};

	/** @inheritDoc */
	public user: IUser|undefined;

	/** @inheritDoc */
	public readonly users: Users	= users;

	/** Closes a chat with an anonymous user. Otherwise, this is a no-op. */
	public close () : void {}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.id);
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures();
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		for (const message of messages) {
			if (message.event !== rpcEvents.text) {
				continue;
			}

			this.trigger(rpcEvents.text, message.data);

			if (util.random(7) !== 0) {
				continue;
			}

			(async () => {
				if (!this.user || this.replies.has(this.user.username)) {
					return;
				}

				this.replies.add(this.user.username);
				await util.sleep(util.random(10000, 3000));
				this.trigger(rpcEvents.typing, {isTyping: true});
				await util.sleep(util.random(4000, 1000));
				this.trigger(rpcEvents.typing, {isTyping: false});

				this.trigger(rpcEvents.text, {
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

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.id, data);
	}

	constructor (
		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService
	) {}
}
