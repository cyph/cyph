import {IProto} from '../iproto';

/** Generic/primitive map value encoder/decoder. */
export class GenericMapProto<T> implements IProto<Record<string, T>> {
	/** @inheritDoc */
	public create () : Record<string, T> {
		return {};
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<Record<string, T>> {
		return (await this.proto.decode(bytes)).data || {};
	}

	/** @inheritDoc */
	public async encode (data: Record<string, T>) : Promise<Uint8Array> {
		const o = await this.proto.encode({data});
		return o instanceof Uint8Array ? o : o.finish();
	}

	/** @inheritDoc */
	public async verify (
		data: Record<string, T>
	) : Promise<string | undefined> {
		return this.proto.verify({data});
	}

	constructor (
		/** @ignore */
		private readonly proto: IProto<{data: Record<string, T> | undefined}>
	) {}
}
