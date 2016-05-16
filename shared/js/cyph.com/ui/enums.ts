/**
 * Possible states of cyph.com UI.
 */
export enum States {
	home,
	contact,
	donate,
	pricing,
	checkout,
	error,
	faq,
	privacypolicy,
	termsofservice
}

/**
 * Map of URL states to page titles.
 */
export const PageTitles	= {
	'': `Cyph – Encrypted Messenger`,
	about: `About Cyph`,
	features: `Cyph's Features`,
	gettingstarted: `Getting Started with Cyph`,
	intro: `Introduction to Cyph`,
	register: `Cyph Account Signup`,
	testimonials: `What People Say about Cyph`,
	contact: `Get in Touch with Cyph`,
	donate: `Donate to Cyph`,
	pricing: `Cyph Pricing`,
	checkout: `Cyph - Checkout`,
	error: `Page Not Found`,
	faq: `Frequently Asked Questions`,
	privacypolicy: `Cyph's Privacy Policy`,
	termsofservice: `Cyph's Terms of Service`,
	betalist: `Cyph – BetaList`,
	jjgo: `Cyph – Jordan, Jesse, Go!`,
	judgejohn: `Cyph – Judge John Hodgman`,
	mybrother: `Cyph – My Brother, My Brother and Me`,
	penn: `Cyph – Penn's Sunday School`,
	sawbones: `Cyph – Sawbones`,
	security: `Cyph – The Security Brief`,
	ventura: `Cyph – We The People`
};

/**
 * Possible states of home page.
 */
export enum HomeSections {
	about,
	features,
	gettingstarted,
	intro,
	promo,
	register,
	testimonials
}

/**
 * Possible states of promo promo page.
 */
export enum Promos {
	none,
	betalist,
	jjgo,
	judgejohn,
	mybrother,
	penn,
	sawbones,
	security,
	ventura
}
