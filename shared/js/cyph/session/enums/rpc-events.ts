/**
 * Subset of events allowed to be remotely triggered by other parties.
 */
export enum RpcEvents {
	accountMasterKey = 'accountMasterKey',
	accountMasterKeyConfirmation = 'accountMasterKeyConfirmation',
	burnerGroup = 'burnerGroup',
	confirm = 'confirm',
	p2p = 'p2p',
	p2pKill = 'p2pKill',
	p2pRequest = 'p2pRequest',
	text = 'text',
	typing = 'typing'
}
