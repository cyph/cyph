import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {uuid} from './uuid';


describe('uuid', () => {
	it('can be decoded', () => {
		const id		= uuid();
		const idBytes	= potassiumUtil.fromHex(id);

		expect(idBytes instanceof Uint8Array).toBe(true);
		expect(idBytes.length).toBe(16);
	});
});
