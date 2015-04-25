/// <reference path="ifiletransfer.ts" />


module Cyph {
	export module P2P {
		export class FileTransfer implements IFileTransfer {
			public data: ArrayBuffer[]		= null;
			public name: string				= '';
			public readableSize: string		= '';
			public percentComplete: number	= 0;
			public size: number				= 0;

			public constructor () {}
		}
	}
}
