import {potassiumUtil} from '../crypto/potassium/potassium-util';
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
			potassiumUtil.splitBytes(bytes).map(async b => this.proto.decode(b))
		);
	}

	/** @inheritDoc */
	public async encode (data: T[]) : Promise<Uint8Array> {
		return potassiumUtil.joinBytes(
			...(await Promise.all(
				data.map(async t => {
					const o = await this.proto.encode(t);
					return o instanceof Uint8Array ? o : o.finish();
				})
			))
		);
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
