import {util} from '../util';
import {Command} from './command';
import {events, rpcEvents, users} from './enums';
import {IMutex} from './imutex';
import {ISession} from './isession';
import {Message} from './message';


/** @inheritDoc */
export class Mutex implements IMutex {
	/** @ignore */
	private static readonly constants	= {
		release: 'release',
		request: 'request'
	};


	/** @ignore */
	private readonly commands	= {
		release: () : void => {
			if (this.owner !== users.me) {
				this.shiftRequester();
			}
		},

		request: (purpose: string) : void => {
			if (this.owner !== users.me) {
				this.owner		= users.other;
				this.purpose	= purpose;

				this.session.send(
					new Message(
						rpcEvents.mutex,
						new Command(Mutex.constants.release)
					)
				);
			}
			else {
				this.requester	= {purpose, user: users.other};
			}
		}
	};

	/** @ignore */
	private owner: string;

	/** @ignore */
	private purpose: string;

	/** @ignore */
	private requester?: {purpose: string; user: string};

	/** @ignore */
	private shiftRequester () : void {
		this.owner		= '';
		this.purpose	= '';

		if (this.requester) {
			this.owner		= this.requester.user;
			this.purpose	= this.requester.purpose;
			this.requester	= undefined;
		}
	}

	/** @inheritDoc */
	public async lock (purpose: string = '') : Promise<{
		friendLockpurpose: string;
		wasFirst: boolean;
		wasFirstOfType: boolean;
	}> {
		let friendHadLockFirst	= false;
		let friendLockpurpose	= '';

		if (this.owner !== users.me) {
			if (!this.owner && this.session.state.isAlice) {
				this.owner		= users.me;
				this.purpose	= purpose;
			}
			else {
				this.requester	= {user: users.me, purpose};
			}

			this.session.send(
				new Message(
					rpcEvents.mutex,
					new Command(
						Mutex.constants.request,
						purpose
					)
				)
			);
		}

		while (this.owner !== users.me) {
			await util.sleep();

			if (this.owner === users.other) {
				friendHadLockFirst	= true;
				friendLockpurpose	= this.purpose;
			}
		}

		return {
			friendLockpurpose,
			wasFirst: !friendHadLockFirst,
			wasFirstOfType: !friendLockpurpose || friendLockpurpose !== purpose
		};
	}

	/** @inheritDoc */
	public unlock () : void {
		if (this.owner === users.me) {
			this.shiftRequester();

			this.session.send(
				new Message(
					rpcEvents.mutex,
					new Command(Mutex.constants.release)
				)
			);
		}
	}

	constructor (
		/** @ignore */
		private readonly session: ISession
	) {
		this.session.on(rpcEvents.mutex, (command: Command) => {
			if (command.method in this.commands) {
				(<any> this.commands)[command.method](command.argument);
			}
		});

		this.session.on(events.closeChat, () => {
			this.owner	= users.me;
		});
	}
}
