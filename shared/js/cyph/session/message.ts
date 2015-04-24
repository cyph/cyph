/// <reference path="imessage.ts" />


module Cyph {
	export module Session {
		export class Message implements IMessage {
			public constructor (
				public event: string = '',
				public data?: any,
				public id: string = Util.generateGuid()
			) {}
		}
	}
}
