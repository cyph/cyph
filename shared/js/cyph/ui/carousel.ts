import {Util} from '../util';


/**
 * Carousel UI component.
 */
export class Carousel {
	private static activeClass: string	= 'active';


	private itemNumber: number;
	private logos: JQuery;
	private quotes: JQuery;

	/**
	 * Sets the active item to be displayed.
	 * @param itemNumber
	 */
	public async setItem (itemNumber: number = this.itemNumber) : Promise<number> {
		if (!this.logos || !this.quotes) {
			do {
				await Util.sleep(250);
				this.logos	= this.rootElement.find('.logo');
				this.quotes	= this.rootElement.find('.quote');
			} while (this.logos.length < 1 || this.quotes.length < 1);

			await Util.sleep(1000);
		}

		this.itemNumber	= itemNumber;

		this.quotes.parent().height(
			this.quotes.
				toArray().
				map((elem: HTMLElement) => $(elem).height()).
				reduce((a: number, b: number) => Math.max(a, b))
		);

		this.logos.
			add(this.quotes).
			removeClass(Carousel.activeClass)
		;

		await Util.sleep(600);

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

		return timeout;
	}

	/**
	 * @param rootElement
	 * @param callback
	 */
	public constructor (
		private rootElement: JQuery,
		callback: Function = () => {}
	) { (async () => {
		const timeout	= await this.setItem(0);
		callback();
		await Util.sleep(timeout);

		while (true) {
			await Util.sleep(
				this.rootElement.is(':appeared') ?
					(await this.setItem()) :
					500
			);
		}
	})(); }
}
