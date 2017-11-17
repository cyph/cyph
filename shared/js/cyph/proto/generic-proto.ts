import {IProto} from '../iproto';


/** Generic/primitive value encoder/decoder. */
export class GenericProto<T> implements IProto<T> {
	/** @inheritDoc */
	public create () : T {
		return this.proto.create().data;
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<T> {
		return (await this.proto.decode(bytes)).data;
	}

	/** @inheritDoc */
	public async encode (data: T) : Promise<Uint8Array> {
		const o	= await this.proto.encode({data});
		return o instanceof Uint8Array ? o : o.finish();
	}

	/** @inheritDoc */
	public verify (data: T) : any {
		return this.proto.verify({data});
	}

	constructor (
		/** @ignore */
		private readonly proto: IProto<{data: T}>
	) {}
}
