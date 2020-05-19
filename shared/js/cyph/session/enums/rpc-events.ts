/**
 * Subset of events allowed to be remotely triggered by other parties.
 */
export class RpcEvents {
	/** @see RpcEvents */
	public readonly accountMasterKey: string = 'accountMasterKey';

	/** @see RpcEvents */
	public readonly capabilities: string = 'capabilities';

	/** @see RpcEvents */
	public readonly confirm: string = 'confirm';

	/** @see RpcEvents */
	public readonly p2p: string = 'p2p';

	/** @see RpcEvents */
	public readonly p2pKill: string = 'p2pKill';

	/** @see RpcEvents */
	public readonly p2pRequest: string = 'p2pRequest';

	/** @see RpcEvents */
	public readonly ping: string = 'ping';

	/** @see RpcEvents */
	public readonly pong: string = 'pong';

	/** @see RpcEvents */
	public readonly text: string = 'text';

	/** @see RpcEvents */
	public readonly typing: string = 'typing';

	constructor () {}
}

/** @see RpcEvents */
export const rpcEvents = new RpcEvents();
