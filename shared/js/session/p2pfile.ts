/// <reference path="../globals.ts" />


module Session {
	export class P2PFile {
		public data: ArrayBuffer[]		= null;
		public name: string				= '';
		public readableSize: string		= '';
		public percentComplete: number	= 0;
		public size: number				= 0;

		public constructor () {}
	}
}
