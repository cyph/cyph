/// <reference path="../../global/base.ts" />


module Cyph {
	export module P2P {
		export class FileTransfer {
			public data: ArrayBuffer[]		= null;
			public name: string				= '';
			public readableSize: string		= '';
			public percentComplete: number	= 0;
			public size: number				= 0;

			public constructor () {}
		}
	}
}
