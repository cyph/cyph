import {util} from '../../cyph/util';


/**
 * Map of URL states to page titles.
 */
export class PageTitles {
	/** @see PageTitles */
	public readonly about: string			= util.translate(
		`About Cyph`
	);

	/** @see PageTitles */
	public readonly betalist: string		= util.translate(
		`Cyph – BetaList`
	);

	/** @see PageTitles */
	public readonly checkout: string		= util.translate(
		`Cyph - Checkout`
	);

	/** @see PageTitles */
	public readonly claimusername: string	= util.translate(
		`Cyph - Claim Your Username`
	);

	/** @see PageTitles */
	public readonly contact: string			= util.translate(
		`Get in Touch with Cyph`
	);

	/** @see PageTitles */
	public readonly defaultTitle: string	= util.translate(
		`Cyph – Encrypted Messenger`
	);

	/** @see PageTitles */
	public readonly disrupt: string			= util.translate(
		`Cyph — TechCrunch Disrupt SF 2017`
	);

	/** @see PageTitles */
	public readonly donate: string			= util.translate(
		`Donate to Cyph`
	);

	/** @see PageTitles */
	public readonly error: string			= util.translate(
		`Page Not Found`
	);

	/** @see PageTitles */
	public readonly faq: string				= util.translate(
		`Frequently Asked Questions`
	);

	/** @see PageTitles */
	public readonly features: string		= util.translate(
		`Cyph's Features`
	);

	/** @see PageTitles */
	public readonly gettingstarted: string	= util.translate(
		`Getting Started with Cyph`
	);

	/** @see PageTitles */
	public readonly intro: string			= util.translate(
		`Introduction to Cyph`
	);

	/** @see PageTitles */
	public readonly invite: string			= util.translate(
		`Cyph Account Invite`
	);

	/** @see PageTitles */
	public readonly jjgo: string			= util.translate(
		`Cyph – Jordan, Jesse, Go!`
	);

	/** @see PageTitles */
	public readonly judgejohn: string		= util.translate(
		`Cyph – Judge John Hodgman`
	);

	/** @see PageTitles */
	public readonly mybrother: string		= util.translate(
		`Cyph – My Brother, My Brother and Me`
	);

	/** @see PageTitles */
	public readonly penn: string			= util.translate(
		`Cyph – Penn's Sunday School`
	);

	/** @see PageTitles */
	public readonly pricing: string			= util.translate(
		`Cyph Pricing`
	);

	/** @see PageTitles */
	public readonly privacypolicy: string	= util.translate(
		`Cyph's Privacy Policy`
	);

	/** @see PageTitles */
	public readonly register: string		= util.translate(
		`Cyph Account Signup`
	);

	/** @see PageTitles */
	public readonly sawbones: string		= util.translate(
		`Cyph – Sawbones`
	);

	/** @see PageTitles */
	public readonly security: string		= util.translate(
		`Cyph – The Security Brief`
	);

	/** @see PageTitles */
	public readonly termsofservice: string	= util.translate(
		`Cyph's Terms of Service`
	);

	/** @see PageTitles */
	public readonly testimonials: string	= util.translate(
		`What People Say about Cyph`
	);

	/** @see PageTitles */
	public readonly ventura: string			= util.translate(
		`Cyph – We The People`
	);

	/** @see PageTitles */
	public readonly waitlisttrack: string	= util.translate(
		`Cyph – Waitlist Position`
	);

	constructor () {}
}

/** @see PageTitles */
export const pageTitles	= new PageTitles();
