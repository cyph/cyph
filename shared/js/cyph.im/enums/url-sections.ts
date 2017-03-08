/**
 * Possible sections of URL state.
 */
export class UrlSections {
	/** @see UrlSections */
	public readonly account: string		= 'account';

	/** @see UrlSections */
	public readonly extension: string	= 'extension';

	/** @see UrlSections */
	public readonly root: string		= '';

	constructor () {}
}

/** @see UrlSections */
export const urlSections	= new UrlSections();
