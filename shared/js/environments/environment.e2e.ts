import {IEnvironment} from '../cyph/proto/types';

/** @inheritDoc */
export const environment: IEnvironment = {
	envName: 'e2e',
	firebase: {
		apiKey: 'AIzaSyAlKGz0Q6RuXTldzlK-b56fzYqx-oqwCrQ',
		appId: '1:695005264752:web:b336cc8c13af88044b2db5',
		messagingSenderId: '695005264752',
		project: 'cyph-test-e2e'
	},
	local: true,
	production: false,
	test: true
};
