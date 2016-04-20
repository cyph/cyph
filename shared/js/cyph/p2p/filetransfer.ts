import {IFileTransfer} from 'ifiletransfer';


export class FileTransfer implements IFileTransfer {
	public data: ArrayBuffer[]		= null;
	public key: Uint8Array			= null;
	public name: string				= '';
	public readableSize: string		= '';
	public pendingChunks: number	= 0;
	public percentComplete: number	= 0;
	public size: number				= 0;

	public constructor () {}
}
