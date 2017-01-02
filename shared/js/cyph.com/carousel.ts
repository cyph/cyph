import {util} from '../cyph/util';


/**
 * Carousel UI component.
 */
export class Carousel {
	/** @ignore */
	private static readonly activeClass: string	= 'active';


	/** @ignore */
	private itemNumber: number;

	/** @ignore */
	private logos: JQuery;

	/** @ignore */
	private quotes: JQuery;

	/**
	 * Sets the active item to be displayed.
	 * @param itemNumber
	 */
	public async setItem (itemNumber: number = this.itemNumber) : Promise<void> {
		if (!this.logos || !this.quotes) {
			this.logos	= await util.waitForIterable(() => this.rootElement.find('.logo'));
			this.quotes	= await util.waitForIterable(() => this.rootElement.find('.quote'));
			await util.sleep(1000);
		}

		this.itemNumber	= itemNumber;

		if (this.autoResize) {
			this.quotes.parent().height(
				this.quotes.
					toArray().
					map((elem: HTMLElement) => $(elem).height()).
					reduce((a: number, b: number) => Math.max(a, b))
			);
		}

		this.logos.
			add(this.quotes).
			removeClass(Carousel.activeClass)
		;

		await util.sleep(600);

		const timeout	=
			(this.quotes.eq(this.itemNumber).text().length + 10) * 50
		;

		if (this.itemNumber === itemNumber) {
			this.logos.eq(itemNumber).
				add(this.quotes.eq(itemNumber)).
				addClass(Carousel.activeClass)
			;

			++this.itemNumber;
			if (this.itemNumber >= this.logos.length) {
				this.itemNumber	= 0;
			}
		}

		await util.sleep(timeout);
	}

	constructor (
		/** @ignore */
		private readonly rootElement: JQuery,

		/** @ignore */
		private readonly autoResize?: boolean
	) { (async () => {
		await this.setItem(0);

		while (true) {
			if (this.rootElement.is(':appeared')) {
				await this.setItem();
			}
			else {
				await util.sleep(500);
			}
		}
	})(); }
}
