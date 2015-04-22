module Cyph {
	export module Session {
		export class Command {
			public method: string;
			public argument: any;

			public constructor (method: string = '', argument: any = '') {
				this.method		= method;
				this.argument	= argument;
			}
		}
	}
}
