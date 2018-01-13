import * as $ from 'jquery';
import {sleep, waitForIterable} from '../cyph/util/wait';


/**
 * Carousel UI component.
 */
export class Carousel {
	/** @ignore */
	private static readonly activeClass: string	= 'active';


	/** @ignore */
	private itemNumber: number	= 0;

	/** @ignore */
	private readonly logos: Promise<JQuery>				= waitForIterable(
		() => this.rootElement.find('.logo')
	);

	/** @ignore */
	private readonly quoteContainer: Promise<JQuery>	= waitForIterable(
		() => this.rootElement.find('.quote-container')
	);

	/** @ignore */
	private readonly quotes: Promise<JQuery>			= waitForIterable(
		() => this.rootElement.find('.quote')
	);

	/** Sets the active item to be displayed. */
	public async setItem (itemNumber: number = this.itemNumber) : Promise<void> {
		const logos				= await this.logos;
		const quoteContainer	= await this.quoteContainer;
		const quotes			= await this.quotes;

		this.itemNumber	= itemNumber;

		if (this.autoResize) {
			quoteContainer.height(
				quotes.
					toArray().
					map((elem: HTMLElement) => $(elem).height() || 0).
					reduce((a, b) => Math.max(a, b))
			);
		}

		logos.
			add(quotes).
			removeClass(Carousel.activeClass)
		;

		await sleep(600);

		const timeout	=
			(quotes.eq(this.itemNumber).text().length + 10) * 150
		;

		if (this.itemNumber === itemNumber) {
			logos.eq(itemNumber).
				add(quotes.eq(itemNumber)).
				addClass(Carousel.activeClass)
			;

			++this.itemNumber;
			if (this.itemNumber >= logos.length) {
				this.itemNumber	= 0;
			}
		}

		await sleep(timeout);
	}

	constructor (
		/** @ignore */
		private readonly rootElement: JQuery,

		/** @ignore */
		private readonly autoResize?: boolean
	) { (async () => {
		await this.logos;
		await this.quoteContainer;
		await this.quotes;

		await waitForIterable(() => this.rootElement.filter(':appeared'));
		await sleep(1000);

		const rows	= this.rootElement.find('.quote-row');
		rows.each((i, elem) => {
			const offset	= rows.
				slice(0, i).
				toArray().
				map(row => $(row).height() || 0).
				reduce((a, b) => a + b, 0).
				toString()
			;

			$(elem).css('transform', `translateY(-${offset}px)`);
		});

		while (true) {
			await this.setItem();
		}
	})(); }
}
