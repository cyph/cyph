/**
 * Possible states of cyph.im UI.
 */
export enum States {
	beta,
	blank,
	chat,
	error,
	none,
	spinningUp,
	waitingForFriend
}

/**
 * Possible states of beta UI.
 */
export enum BetaStates {
	login,
	none,
	register,
	settings
}

/**
 * Possible sections of URL state.
 */
export const urlSections	= {
	audio: 'audio',
	beta: 'beta',
	root: '',
	video: 'video'
};
