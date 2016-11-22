import {Util} from '../util';
import {Command} from './command';
import {Events, rpcEvents, Users} from './enums';
import {IMutex} from './imutex';
import {ISession} from './isession';
import {Message} from './message';


/** @inheritDoc */
export class Mutex implements IMutex {
	/** @ignore */
	private static constants	= {
		release: 'release',
		request: 'request'
	};


	/** @ignore */
	private owner: string;

	/** @ignore */
	private purpose: string;

	/** @ignore */
	private requester: {user: string; purpose: string};

	/** @ignore */
	private commands	= {
		release: () : void => {
			if (this.owner !== Users.me) {
				this.shiftRequester();
			}
		},

		request: (purpose: string) : void => {
			if (this.owner !== Users.me) {
				this.owner		= Users.other;
				this.purpose	= purpose;

				this.session.send(
					new Message(
						rpcEvents.mutex,
						new Command(Mutex.constants.release)
					)
				);
			}
			else {
				this.requester	= {user: Users.other, purpose};
			}
		}
	};

	/** @ignore */
	private shiftRequester () : void {
		this.owner		= null;
		this.purpose	= null;

		if (this.requester) {
			this.owner		= this.requester.user;
			this.purpose	= this.requester.purpose;
			this.requester	= null;
		}
	}

	/** @inheritDoc */
	public async lock (purpose: string = '') : Promise<{
		friendLockpurpose: string;
		wasFirst: boolean;
		wasFirstOfType: boolean;
	}> {
		let friendHadLockFirst: boolean	= false;
		let friendLockpurpose: string	= '';

		if (this.owner !== Users.me) {
			if (!this.owner && this.session.state.isAlice) {
				this.owner		= Users.me;
				this.purpose	= purpose;
			}
			else {
				this.requester	= {user: Users.me, purpose};
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

		while (this.owner !== Users.me) {
			await Util.sleep(250);

			if (this.owner === Users.other) {
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
		if (this.owner === Users.me) {
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
		private session: ISession
	) {
		this.session.on(rpcEvents.mutex, (command: Command) =>
			Util.getValue(this.commands, command.method, (o: any) => {})(command.argument)
		);

		this.session.on(Events.closeChat, () => this.owner = Users.me);
	}
}
