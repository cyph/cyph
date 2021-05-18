import {IProto} from '../iproto';

/** Generic/primitive array value encoder/decoder. */
export class GenericArrayProto<T> implements IProto<T[]> {
	/** @inheritDoc */
	public create () : T[] {
		return [];
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<T[]> {
		return (await this.proto.decode(bytes)).data || [];
	}

	/** @inheritDoc */
	public async encode (data: T[]) : Promise<Uint8Array> {
		const o = await this.proto.encode({data});
		return o instanceof Uint8Array ? o : o.finish();
	}

	/** @inheritDoc */
	public async verify (data: T[]) : Promise<string | undefined> {
		return this.proto.verify({data});
	}

	constructor (
		/** @ignore */
		private readonly proto: IProto<{data: T[] | undefined}>
	) {}
}
