/**
 * Possible states of cyph.im UI.
 */
export enum States {
	none,
	blank,
	chat,
	error,
	pro,
	spinningUp,
	waitingForFriend
}

/**
 * Possible states of Pro UI.
 */
export enum ProStates {
	none,
	login,
	register,
	settings
}

/**
 * Possible sections of URL state.
 */
export const UrlSections	= {
	root: '',
	pro: 'pro',
	video: 'video',
	audio: 'audio'
};
