/**
 * Possible states of cyph.im UI.
 */
export enum States {
	none,
	blank,
	chat,
	error,
	beta,
	spinningUp,
	waitingForFriend
}

/**
 * Possible states of beta UI.
 */
export enum BetaStates {
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
	beta: 'beta',
	video: 'video',
	audio: 'audio'
};
