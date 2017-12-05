import {IProto} from '../iproto';


/** Generic/primitive map value encoder/decoder. */
export class GenericMapProto<T> implements IProto<{[k: string]: T}> {
	/** @inheritDoc */
	public create () : {[k: string]: T} {
		return this.proto.create().data || {};
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<{[k: string]: T}> {
		return (await this.proto.decode(bytes)).data || {};
	}

	/** @inheritDoc */
	public async encode (data: {[k: string]: T}) : Promise<Uint8Array> {
		const o	= await this.proto.encode({data});
		return o instanceof Uint8Array ? o : o.finish();
	}

	/** @inheritDoc */
	public verify (data: {[k: string]: T}) : any {
		return this.proto.verify({data});
	}

	constructor (
		/** @ignore */
		private readonly proto: IProto<{data: {[k: string]: T}|undefined}>
	) {}
}
