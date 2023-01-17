import {PotassiumData} from '../../../proto';

/** On 2025-01-01, support for old algorithms will be dropped. */
const currentAlgorithmsEOL = 1735689600000;

/* eslint-disable-next-line @typescript-eslint/tslint/config */
const timestamp = Date.now();

/** Indicates minimum supported version of each algorithm. */
export const potassiumAlgorithmDeprecation = {
	boxMinimumAlgorithm:
		timestamp > currentAlgorithmsEOL ?
			PotassiumData.BoxAlgorithms.NativeV2 :
			PotassiumData.BoxAlgorithms.NativeV1,
	ephemeralKeyExchangeMinimumAlgorithm:
		timestamp > currentAlgorithmsEOL ?
			PotassiumData.EphemeralKeyExchangeAlgorithms.V2 :
			PotassiumData.EphemeralKeyExchangeAlgorithms.V1,
	oneTimeAuthMinimumAlgorithm: PotassiumData.OneTimeAuthAlgorithms.NativeV1,
	secretBoxMinimumAlgorithm: PotassiumData.SecretBoxAlgorithms.NativeV1,
	signMinimumAlgorithm:
		timestamp > currentAlgorithmsEOL ?
			PotassiumData.SignAlgorithms.NativeV2Hardened :
			PotassiumData.SignAlgorithms.NativeV1
};
