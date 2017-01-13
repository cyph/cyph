/**
 * Possible sections of URL state.
 */
export class UrlSections {
	/** @see UrlSections */
	public readonly beta: string	= 'beta';

	/** @see UrlSections */
	public readonly root: string	= '';

	constructor () {}
}

/** @see UrlSections */
export const urlSections	= new UrlSections();
