import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {ISessionCapabilities} from '../proto/types';
import {ISessionCapabilitiesService} from '../service-interfaces/isession-capabilities.service';
import {RpcEvents} from '../session';
import {resolvable} from '../util/wait';
import {SessionService} from './session.service';

/** @inheritDoc */
@Injectable()
export class SessionCapabilitiesService extends BaseProvider
	implements ISessionCapabilitiesService {
	/** @ignore */
	private readonly _CAPABILITIES = resolvable<ISessionCapabilities>();

	/** @ignore */
	private readonly _P2P_SUPPORT = resolvable<boolean>();

	/** @ignore */
	private readonly _WALKIE_TALKIE = resolvable<boolean>();

	/** @ignore */
	private readonly localCapabilities: Promise<
		ISessionCapabilities
	> = (async () => ({
		p2p: await this._P2P_SUPPORT,
		walkieTalkieMode: await this._WALKIE_TALKIE
	}))();

	/** @ignore */
	private readonly remoteCapabilities: Promise<
		ISessionCapabilities
	> = this.sessionService.one(RpcEvents.capabilities).then(
		newEvents =>
			(newEvents[0] || {capabilities: undefined}).capabilities || {
				p2p: false,
				walkieTalkieMode: false
			}
	);

	/** @ignore */
	private readonly resolveCapabilities: (
		capabilities: ISessionCapabilities
	) => void = this._CAPABILITIES.resolve;

	/** @inheritDoc */
	public readonly capabilities = {
		p2p: this._CAPABILITIES.then(o => o.p2p),
		walkieTalkieMode: this._CAPABILITIES.then(o => o.walkieTalkieMode)
	};

	/** @inheritDoc */
	public readonly resolveP2PSupport: (isSupported: boolean) => void = this
		._P2P_SUPPORT.resolve;

	/** @inheritDoc */
	public readonly resolveWalkieTalkieMode: (
		walkieTalkieMode: boolean
	) => void = this._WALKIE_TALKIE.resolve;

	constructor (
		/** @ignore */
		private readonly sessionService: SessionService
	) {
		super();

		this.sessionService.beginChat.then(async () => {
			const localCapabilities = await this.localCapabilities;

			this.sessionService.send([
				RpcEvents.capabilities,
				{capabilities: localCapabilities}
			]);

			const remoteCapabilities = await this.remoteCapabilities;

			this.resolveCapabilities({
				p2p: localCapabilities.p2p && remoteCapabilities.p2p,
				walkieTalkieMode:
					localCapabilities.walkieTalkieMode ||
					remoteCapabilities.walkieTalkieMode
			});
		});
	}
}
