import {namespaces} from './namespaces.js';
import {validateInput} from './validation.js';

export const getFullBurnerBaseURL = (
	namespace,
	callType,
	telehealth = false,
	removeHash = false
) => {
	const {
		burnerURL,
		burnerAudioURL,
		burnerVideoURL,
		telehealthBurnerURL,
		telehealthBurnerAudioURL,
		telehealthBurnerVideoURL
	} = namespaces[namespace];

	const fullBurnerURL = telehealth ?
		callType === 'audio' ?
			telehealthBurnerAudioURL :
		callType === 'video' ?
			telehealthBurnerVideoURL :
			telehealthBurnerURL :
	callType === 'audio' ?
		burnerAudioURL :
	callType === 'video' ?
		burnerVideoURL :
		burnerURL;

	return removeHash ? fullBurnerURL.replace('#', '') : fullBurnerURL;
};

export const getBurnerLink = (
	namespace,
	id,
	username,
	callType,
	telehealth = false
) =>
	`${getFullBurnerBaseURL(namespace, callType, telehealth, !!username)}${
		username ? `${username}/` : ''
	}${validateInput(id, /^[A-Za-z0-9_-]+(\.\d{4})?$/)}`;
