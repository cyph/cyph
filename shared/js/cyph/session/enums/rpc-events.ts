/**
 * Subset of events allowed to be remotely triggered by other parties.
 */
export class RpcEvents {
	/** @see RpcEvents */
	public readonly capabilities: string	= 'capabilities';

	/** @see RpcEvents */
	public readonly confirm: string			= 'confirm';

	/** @see RpcEvents */
	public readonly files: string			= 'files';

	/** @see RpcEvents */
	public readonly p2p: string				= 'p2p';

	/** @see RpcEvents */
	public readonly text: string			= 'text';

	/** @see RpcEvents */
	public readonly typing: string			= 'typing';

	constructor () {}
}

/** @see RpcEvents */
export const rpcEvents	= new RpcEvents();
