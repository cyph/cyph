import {PotassiumData} from '../../proto/types';

/** Current signing algorithm set. */
export interface ICurrentSignAlgorithm {
	/** Stronger algorithm to use in special cases. */
	readonly hardened: PotassiumData.SignAlgorithms;

	/** Algorithm to use by default. */
	readonly primary: PotassiumData.SignAlgorithms;
}
