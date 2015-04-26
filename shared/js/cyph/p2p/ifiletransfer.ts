module Cyph {
	export module P2P {
		export interface IFileTransfer {
			data: ArrayBuffer[];
			name: string;
			readableSize: string;
			percentComplete: number;
			size: number;
		}
	}
}
