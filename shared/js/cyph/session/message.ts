/// <reference path="../util.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module Session {
		export class Message {
			public id: string;
			public event: string;
			public data: any;

			public constructor (event: string = '', data?: any) {
				this.id		= Util.generateGuid();
				this.event	= event;
				this.data	= data;
			}
		}
	}
}
