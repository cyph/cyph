/// <reference path="session.ts" />
/// <reference path="../globals.ts" />
/// <reference path="../util.ts" />


module Session {
	export class Mutex {
		private owner: Authors;
		private purpose: string;
		private requester: { author: Authors; purpose: string; };
		private session: Session;

		private commands	= {
			release: () : void => {
				if (this.owner != Authors.me) {
					this.shiftRequester();
				}
			},

			request: (purpose: string) : void => {
				if (this.owner != Authors.me) {
					this.owner		= Authors.friend;
					this.purpose	= purpose;

					this.session.send(new Message(Events.mutex, new Command('release')));
				}
				else {
					this.requester	= {author: Authors.friend, purpose};
				}
			}
		};

		private shiftRequester () : void {
			this.owner		= null;
			this.purpose	= null;

			if (this.requester) {
				this.owner		= this.requester.author;
				this.purpose	= this.requester.purpose;
				this.requester	= null;
			}
		}

		public constructor (session: Session) {
			this.session	= session;

			this.session.on(Events.mutex, (command: Command) => this.commands[command.method](command.argument));
			this.session.on(Events.closeChat, () => this.owner = Authors.me);
		}

		public lock (f: Function, purpose: string = '') : void {
			if (this.owner != Authors.me) {
				if (!this.owner && this.session.isCreator) {
					this.owner		= Authors.me;
					this.purpose	= purpose;
				}
				else {
					this.requester	= {author: Authors.me, purpose};
				}

				this.session.send(new Message(Events.mutex, new Command('request', purpose)));
			}

			
			let friendHadLockFirst: boolean	= false;
			let friendLockpurpose: string	= '';

			Util.retryUntilComplete((retry: Function) => {
				if (this.owner == Authors.me) {
					f(
						!friendHadLockFirst,
						!friendLockpurpose || friendLockpurpose != purpose,
						friendLockpurpose
					);
				}
				else {
					if (this.owner == Authors.friend) {
						friendHadLockFirst	= true;
						friendLockpurpose	= this.purpose;
					}

					retry();
				}
			});
		}

		public unlock () : void {
			if (this.owner == Authors.me) {
				this.shiftRequester();
				this.session.send(new Message(Events.mutex, new Command('release')));
			}
		}
	}
}
