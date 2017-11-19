import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {BinaryProto} from '../cyph/proto';
import {DatabaseService} from '../cyph/services/database.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';


testEnvironmentSetup = async (
	databaseService: DatabaseService,
	localStorageService: LocalStorageService
) => {
	const currentTestDataVersion	= await databaseService.getItem(
		'users/testDataVersion/certificate',
		BinaryProto
	).catch(
		() => new Uint8Array(0)
	);

	const localTestDataVersion		= await localStorageService.getItem(
		'testDataVersion',
		BinaryProto
	).catch(
		() => new Uint8Array(0)
	);

	if (potassiumUtil.compareMemory(currentTestDataVersion, localTestDataVersion)) {
		return;
	}

	const keysToPreserve	= ['username', 'password', 'pinIsCustom'];
	const preservedValues	= new Map<string, Uint8Array|undefined>();

	for (const k of keysToPreserve) {
		preservedValues.set(
			k,
			await localStorageService.getItem(k, BinaryProto).catch(() => undefined)
		);
	}

	await localStorageService.clear();
	await localStorageService.setItem('testDataVersion', BinaryProto, currentTestDataVersion);

	for (const k of keysToPreserve) {
		const v	= preservedValues.get(k);
		if (v) {
			await localStorageService.setItem(k, BinaryProto, v);
		}
	}

	location.reload();
};
