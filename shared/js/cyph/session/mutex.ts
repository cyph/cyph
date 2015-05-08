/// <reference path="imutex.ts" />
/// <reference path="command.ts" />


module Cyph {
	export module Session {
		export class Mutex implements IMutex {
			private static constants	= {
				release: 'release',
				request: 'request'
			};


			private owner: Users;
			private purpose: string;
			private requester: { user: Users; purpose: string; };

			private commands	= {
				release: () : void => {
					if (this.owner !== Users.me) {
						this.shiftRequester();
					}
				},

				request: (purpose: string) : void => {
					if (this.owner !== Users.me) {
						this.owner		= Users.friend;
						this.purpose	= purpose;

						this.session.send(
							new Message(
								RPCEvents.mutex,
								new Command(Mutex.constants.release)
							)
						);
					}
					else {
						this.requester	= {user: Users.friend, purpose};
					}
				}
			};

			private shiftRequester () : void {
				this.owner		= null;
				this.purpose	= null;

				if (this.requester) {
					this.owner		= this.requester.user;
					this.purpose	= this.requester.purpose;
					this.requester	= null;
				}
			}

			public lock (f: Function, purpose: string = '') : void {
				if (this.owner !== Users.me) {
					if (!this.owner && this.session.state.isCreator) {
						this.owner		= Users.me;
						this.purpose	= purpose;
					}
					else {
						this.requester	= {user: Users.me, purpose};
					}

					this.session.send(
						new Message(
							RPCEvents.mutex,
							new Command(
								Mutex.constants.request,
								purpose
							)
						)
					);
				}

				
				let friendHadLockFirst: boolean	= false;
				let friendLockpurpose: string	= '';

				Util.retryUntilComplete(retry => {
					if (this.owner === Users.me) {
						f(
							!friendHadLockFirst,
							!friendLockpurpose || friendLockpurpose !== purpose,
							friendLockpurpose
						);
					}
					else {
						if (this.owner === Users.friend) {
							friendHadLockFirst	= true;
							friendLockpurpose	= this.purpose;
						}

						retry();
					}
				});
			}

			public unlock () : void {
				if (this.owner === Users.me) {
					this.shiftRequester();

					this.session.send(
						new Message(
							RPCEvents.mutex,
							new Command(Mutex.constants.release)
						)
					);
				}
			}

			/**
			 * @param session
			 */
			public constructor (private session: ISession) {
				this.session.on(RPCEvents.mutex, (command: Command) =>
					this.commands[command.method](command.argument)
				);

				this.session.on(Events.closeChat, () => this.owner = Users.me);
			}
		}
	}
}
