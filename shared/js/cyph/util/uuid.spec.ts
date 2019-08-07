import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {uuid} from './uuid';

describe('uuid', () => {
	it('can be decoded', () => {
		for (const {long, size} of [
			{long: false, size: 16},
			{long: true, size: 68}
		]) {
			const id = uuid(long);
			const idBytes = potassiumUtil.fromHex(id);

			expect(idBytes instanceof Uint8Array).toBe(true);
			expect(idBytes.length).toBe(size);
		}
	});
});
