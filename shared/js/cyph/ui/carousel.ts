module Cyph {
	export module UI {
		/**
		 * Carousel UI component.
		 */
		export class Carousel {
			private static activeClass: string	= 'active';


			private itemNumber: number;
			private logos: JQuery;
			private quotes: JQuery;
			private timeout: any;

			/**
			 * Sets the active item to be displayed.
			 * @param itemNumber
			 */
			public setItem (itemNumber: number = this.itemNumber) : void {
				clearTimeout(this.timeout);

				this.quotes.parent().height(
					this.quotes.
						map((i, elem: HTMLElement) => $(elem).height()).
						toArray().
						reduce((a: number, b: number) => Math.max(a, b))
				);

				this.logos.
					add(this.quotes).
					removeClass(Carousel.activeClass)
				;

				setTimeout(() => this.logos.eq(itemNumber).
					add(this.quotes.eq(itemNumber)).
					addClass(Carousel.activeClass)
				, 600);

				this.itemNumber	= itemNumber + 1;
				if (this.itemNumber >= this.logos.length) {
					this.itemNumber	= 0;
				}

				this.timeout	= setTimeout(
					() => this.setItem(),
					Math.max(
						this.quotes.eq(itemNumber).text().length * 35,
						1000
					)
				);
			}

			/**
			 * @param controller
			 */
			public constructor (
				private rootElement: JQuery,
				callback: Function = () => {}
			) {
				this.logos	= this.rootElement.find('.logo');
				this.quotes	= this.rootElement.find('.quote');

				setTimeout(() => {
					this.setItem(0);
					callback();
				}, 1000);
			}
		}
	}
}
