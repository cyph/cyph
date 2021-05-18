import {Internal} from '../../proto';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';

/** Wraps a proto class with a TimedValue array equivalent. */
export class TimedArrayProto<T> implements IProto<ITimedValue<T>[]> {
	/** @inheritDoc */
	public create () : ITimedValue<T>[] {
		return [];
	}

	/** @inheritDoc */
	public async decode (bytes: Uint8Array) : Promise<ITimedValue<T>[]> {
		return Promise.all(
			(
				await Promise.resolve(Internal.TimedValueArray.decode(bytes))
			).data.map(async o => ({
				timestamp: o.timestamp,
				value: await this.proto.decode(o.value)
			}))
		);
	}

	/** @inheritDoc */
	public async encode (data: ITimedValue<T>[]) : Promise<Uint8Array> {
		const encoded = await Promise.resolve(
			Internal.TimedValueArray.encode({
				data: await Promise.all(
					data.map(async timedValue => {
						const o = await this.proto.encode(timedValue.value);

						return {
							timestamp: timedValue.timestamp,
							value: o instanceof Uint8Array ? o : o.finish()
						};
					})
				)
			})
		);

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
