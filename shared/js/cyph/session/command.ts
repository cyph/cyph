module Cyph {
	export module Session {
		export class Command {
			public constructor (
				public method: string = '',
				public argument: any = ''
			) {}
		}
	}
}
