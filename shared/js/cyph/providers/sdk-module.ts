import {MainThreadPotassiumService} from '../services/crypto/main-thread-potassium.service';
import {PotassiumService} from '../services/crypto/potassium.service';

/** Providers for CyphSDKModule. */
export const sdkModuleProviders = [
	{
		provide: PotassiumService,
		useClass: MainThreadPotassiumService
	}
];
