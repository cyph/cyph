import {Injectable} from '@angular/core';
import {ISessionCapabilities} from '../proto';
import {ISessionCapabilitiesService} from '../service-interfaces/isession-capabilities.service';
import {events, ISessionMessageData, rpcEvents} from '../session';
import {resolvable} from '../util/wait';
import {SessionService} from './session.service';


/** @inheritDoc */
@Injectable()
export class SessionCapabilitiesService implements ISessionCapabilitiesService {
	/** @ignore */
	private readonly _CAPABILITIES	= resolvable<ISessionCapabilities>();

	/** @ignore */
	private readonly _P2P_SUPPORT	= resolvable<boolean>();

	/** @ignore */
	private readonly _WALKIE_TALKIE	= resolvable<boolean>();

	/** @ignore */
	private readonly remoteCapabilities: Promise<ISessionCapabilities>	=
		this.sessionService.one<ISessionMessageData>(rpcEvents.capabilities).then(o =>
			o.capabilities || {p2p: false, walkieTalkieMode: false}
		)
	;

	/** @ignore */
	private readonly resolveCapabilities: (capabilities: ISessionCapabilities) => void	=
		this._CAPABILITIES.resolve
	;

	/** @inheritDoc */
	public readonly capabilities: Promise<ISessionCapabilities>			=
		this._CAPABILITIES.promise
	;

	/** @inheritDoc */
	public readonly localCapabilities: Promise<ISessionCapabilities>	= (async () => ({
		p2p: await this._P2P_SUPPORT.promise,
		walkieTalkieMode: await this._WALKIE_TALKIE.promise
	}))();

	/** @inheritDoc */
	public readonly resolveP2PSupport: (isSupported: boolean) => void	=
		this._P2P_SUPPORT.resolve
	;

	/** @inheritDoc */
	public readonly resolveWalkieTalkieMode: (walkieTalkieMode: boolean) => void	=
		this._WALKIE_TALKIE.resolve
	;

	constructor (
		/** @ignore */
		private readonly sessionService: SessionService
	) {
		this.sessionService.one(events.beginChat).then(async () => {
			const localCapabilities		= await this.localCapabilities;

			this.sessionService.send([rpcEvents.capabilities, {capabilities: localCapabilities}]);

			const remoteCapabilities	= await this.remoteCapabilities;

			this.resolveCapabilities({
				p2p: localCapabilities.p2p && remoteCapabilities.p2p,
				walkieTalkieMode:
					localCapabilities.walkieTalkieMode ||
					remoteCapabilities.walkieTalkieMode
			});
		});
	}
}
