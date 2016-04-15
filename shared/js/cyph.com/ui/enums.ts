module Cyph.com {
	export module UI {
		/**
		 * Possible states of cyph.com UI.
		 */
		export enum States {
			home,
			podcast,
			contact,
			donate,
			pricing,
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
			login: `Cyph Login`,
			testimonials: `What People Say about Cyph`,
			contact: `Get in Touch with Cyph`,
			donate: `Donate to Cyph`,
			pricing: `Cyph Pricing`,
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
			login,
			testimonials
		}

		/**
		 * Possible states of podcast promo page.
		 */
		export enum Podcasts {
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
	}
}
