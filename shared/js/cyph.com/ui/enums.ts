module Cyph.com {
	export module UI {
		/**
		 * Possible states of cyph.com UI.
		 */
		export enum States {
			home,
			podcast,
			enterprise,
			error,
			faq,
			privacypolicy,
			termsofservice
		}

		/**
		 * Possible states of home page.
		 */
		export enum HomeSections {
			about,
			contact,
			features,
			intro,
			login
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
