import {Internal} from '../../proto';
import {IProto} from '../iproto';
import {ITimedValue} from '../itimed-value';

/** Wraps a proto class with a maybe-TimedValue array equivalent. */
export class MaybeTimedArrayProto<T>
	implements IProto<(ITimedValue<T> | {empty: true; timestamp?: number})[]>
{
	/** @inheritDoc */
	public create () : (ITimedValue<T> | {empty: true; timestamp?: number})[] {
		return [];
	}

	/** @inheritDoc */
	public async decode (
		bytes: Uint8Array
	) : Promise<(ITimedValue<T> | {empty: true; timestamp?: number})[]> {
		return Promise.all(
			Internal.MaybeTimedValueArray.decode(bytes).data.map(async o =>
				!o.empty && o.value ?
					{
						timestamp: o.timestamp || 0,
						value: await this.proto.decode(o.value)
					} :
					<{empty: true; timestamp?: number}> {
						empty: true,
						timestamp: o.timestamp
					}
			)
		);
	}

	/** @inheritDoc */
	public async encode (
		data: (ITimedValue<T> | {empty: true; timestamp?: number})[]
	) : Promise<Uint8Array> {
		const encoded = Internal.MaybeTimedValueArray.encode({
			data: await Promise.all(
				data.map(async maybeTimedValue => {
					if ('empty' in maybeTimedValue && maybeTimedValue.empty) {
						return {
							empty: true,
							timestamp: maybeTimedValue.timestamp
						};
					}

					const o = await this.proto.encode(
						(<ITimedValue<T>> maybeTimedValue).value
					);

					return {
						timestamp: maybeTimedValue.timestamp,
						value: o instanceof Uint8Array ? o : o.finish()
					};
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
