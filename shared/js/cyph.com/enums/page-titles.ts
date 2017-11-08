import {translate} from '../../cyph/util/translate';


/**
 * Map of URL states to page titles.
 */
export class PageTitles {
	/** @see PageTitles */
	public readonly about: string			= translate(
		`About Cyph`
	);

	/** @see PageTitles */
	public readonly betalist: string		= translate(
		`Cyph – BetaList`
	);

	/** @see PageTitles */
	public readonly checkout: string		= translate(
		`Cyph - Checkout`
	);

	/** @see PageTitles */
	public readonly claimusername: string	= translate(
		`Cyph - Claim Your Username`
	);

	/** @see PageTitles */
	public readonly contact: string			= translate(
		`Get in Touch with Cyph`
	);

	/** @see PageTitles */
	public readonly defaultTitle: string	= translate(
		`Cyph – Encrypted Messenger`
	);

	/** @see PageTitles */
	public readonly disrupt: string			= translate(
		`Cyph — TechCrunch Disrupt SF 2017`
	);

	/** @see PageTitles */
	public readonly donate: string			= translate(
		`Donate to Cyph`
	);

	/** @see PageTitles */
	public readonly error: string			= translate(
		`Page Not Found`
	);

	/** @see PageTitles */
	public readonly faq: string				= translate(
		`Frequently Asked Questions`
	);

	/** @see PageTitles */
	public readonly features: string		= translate(
		`Cyph's Features`
	);

	/** @see PageTitles */
	public readonly gettingstarted: string	= translate(
		`Getting Started with Cyph`
	);

	/** @see PageTitles */
	public readonly intro: string			= translate(
		`Introduction to Cyph`
	);

	/** @see PageTitles */
	public readonly invite: string			= translate(
		`Cyph Account Invite`
	);

	/** @see PageTitles */
	public readonly jjgo: string			= translate(
		`Cyph – Jordan, Jesse, Go!`
	);

	/** @see PageTitles */
	public readonly judgejohn: string		= translate(
		`Cyph – Judge John Hodgman`
	);

	/** @see PageTitles */
	public readonly mybrother: string		= translate(
		`Cyph – My Brother, My Brother and Me`
	);

	/** @see PageTitles */
	public readonly penn: string			= translate(
		`Cyph – Penn's Sunday School`
	);

	/** @see PageTitles */
	public readonly pricing: string			= translate(
		`Cyph Pricing`
	);

	/** @see PageTitles */
	public readonly privacypolicy: string	= translate(
		`Cyph's Privacy Policy`
	);

	/** @see PageTitles */
	public readonly register: string		= translate(
		`Cyph Account Signup`
	);

	/** @see PageTitles */
	public readonly sawbones: string		= translate(
		`Cyph – Sawbones`
	);

	/** @see PageTitles */
	public readonly security: string		= translate(
		`Cyph – The Security Brief`
	);

	/** @see PageTitles */
	public readonly termsofservice: string	= translate(
		`Cyph's Terms of Service`
	);

	/** @see PageTitles */
	public readonly testimonials: string	= translate(
		`What People Say about Cyph`
	);

	/** @see PageTitles */
	public readonly ventura: string			= translate(
		`Cyph – We The People`
	);

	/** @see PageTitles */
	public readonly waitlisttrack: string	= translate(
		`Cyph – Waitlist Position`
	);

	constructor () {}
}

/** @see PageTitles */
export const pageTitles	= new PageTitles();
