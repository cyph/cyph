import memoize from 'lodash-es/memoize';
import {translate} from './translate';

/** Converts variable name into human-friendly title-style text. */
export const titleize = memoize((s: string) =>
	translate(
		s
			.replace(/^([a-z])/g, c => c.toUpperCase())
			.replace(/([A-Z])/g, ' $1')
			.replace(/ And /g, ' & ')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/_ (.*)$/, ' ($1)')
	)
);
