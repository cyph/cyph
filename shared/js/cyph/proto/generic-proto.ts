import {IProto} from '../iproto';

/** Generic/primitive value encoder/decoder. */
export class GenericProto<T> implements IProto<T> {
	/** @inheritDoc */
	public async create () : Promise<T> {
		return this.decodeTransformer((await this.proto.create()).data);
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<T> {
		return this.decodeTransformer((await this.proto.decode(bytes)).data);
	}

	/** @inheritDoc */
	public async encode (data: T) : Promise<Uint8Array> {
		const o = await this.proto.encode({data: this.encodeTransformer(data)});
		return o instanceof Uint8Array ? o : o.finish();
	}

	/** @inheritDoc */
	public async verify (data: T) : Promise<string | undefined> {
		return this.proto.verify({data});
	}

	constructor (
		/** @ignore */
		private readonly proto: IProto<{data: T}>,

		/** @ignore */
		private readonly decodeTransformer: (data: T) => T = data => data,

		/** @ignore */
		private readonly encodeTransformer: (data: T) => T = data => data
	) {}
}
