/**
 * Possible sections of URL state.
 */
export class UrlSections {
	/** @see UrlSections */
	public readonly audio: string	= 'audio';

	/** @see UrlSections */
	public readonly beta: string	= 'beta';

	/** @see UrlSections */
	public readonly root: string	= '';

	/** @see UrlSections */
	public readonly video: string	= '';

	constructor () {}
};

/** @see UrlSections */
export const urlSections	= new UrlSections();
