import {IProto} from '../iproto';
import {deserialize, serialize} from './serialization';

const isEmpty = (value: any) =>
	!value || ('length' in value && value.length === 0);

const mergeObjectsInternal = (o: any, objects: any[]) => {
	for (const k of Object.keys(o)) {
		const value = o[k];
		const backups = () => objects.map(obj => obj[k]);

		if (typeof value === 'object') {
			mergeObjectsInternal(value, backups());
		}
		else if (isEmpty(value)) {
			for (const backup of backups()) {
				if (!isEmpty(backup)) {
					o[k] = backup;
					break;
				}
			}
		}
	}
};

/** Merges objects, with values from earlier ones taking priority. */
export const mergeObjects = async <T>(
	proto: IProto<T>,
	...objects: T[]
) : Promise<T> => {
	const first = objects.shift();

	if (typeof first !== 'object') {
		throw new Error('Cannot merge non-object values.');
	}

	if (objects.length < 1) {
		return first;
	}

	const o = await deserialize(proto, await serialize(proto, first));

	mergeObjectsInternal(o, objects);

	return o;
};
