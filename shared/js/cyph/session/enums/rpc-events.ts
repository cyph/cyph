/**
 * Subset of events allowed to be remotely triggered by other parties.
 */
export class RpcEvents {
	/** @see RpcEvents */
	public readonly accountP2P: string			= 'accountP2P';

	/** @see RpcEvents */
	public readonly capabilities: string		= 'capabilities';

	/** @see RpcEvents */
	public readonly confirm: string				= 'confirm';

	/** @see RpcEvents */
	public readonly files: string				= 'files';

	/** @see RpcEvents */
	public readonly p2p: string					= 'p2p';

	/** @see RpcEvents */
	public readonly ping: string				= 'ping';

	/** @see RpcEvents */
	public readonly pong: string				= 'pong';

	/** @see RpcEvents */
	public readonly requestSymmetricKey: string	= 'requestSymmetricKey';

	/** @see RpcEvents */
	public readonly symmetricKey: string		= 'symmetricKey';

	/** @see RpcEvents */
	public readonly text: string				= 'text';

	/** @see RpcEvents */
	public readonly typing: string				= 'typing';

	constructor () {}
}

/** @see RpcEvents */
export const rpcEvents	= new RpcEvents();
