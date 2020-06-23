import {Internal} from '../../proto';
import {IProto} from '../iproto';

/** Wraps a proto class with an array equivalent. */
export class ArrayWrapperProto<T> implements IProto<T[]> {
	/** @inheritDoc */
	public create () : T[] {
		return [];
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<T[]> {
		return Promise.all(
			Internal.BinaryArray.decode(bytes).data.map(async b =>
				this.proto.decode(b)
			)
		);
	}

	/** @inheritDoc */
	public async encode (data: T[]) : Promise<Uint8Array> {
		const encoded = Internal.BinaryArray.encode({
			data: await Promise.all(
				data.map(async t => {
					const o = await this.proto.encode(t);
					return o instanceof Uint8Array ? o : o.finish();
				})
			)
		});

		return encoded instanceof Uint8Array ? encoded : encoded.finish();
	}

	/** @inheritDoc */
	public verify (_DATA: T[]) : undefined {
		return;
	}

	constructor (
		/** @ignore */
		private readonly proto: IProto<T>
	) {}
}
