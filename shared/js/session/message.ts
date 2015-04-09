/// <reference path="../globals.ts" />


module Session {
	export class Message {
		public id: string;
		public event: string;
		public data: any;

		public constructor (event: string = '', data?: any) {
			this.id		= Date.now() + '-' + crypto.getRandomValues(new Uint32Array(1))[0];
			this.event	= event;
			this.data	= data;
		}
	}
}
