import {Util} from '../util';


/**
 * Carousel UI component.
 */
export class Carousel {
	private static activeClass: string	= 'active';


	private counter: number	= 0;

	private itemNumber: number;
	private logos: JQuery;
	private quotes: JQuery;

	/**
	 * Sets the active item to be displayed.
	 * @param itemNumber
	 */
	public async setItem (itemNumber: number = this.itemNumber) : Promise<void> {
		while (!this.quotes || this.quotes.length < 1) {
			await Util.sleep(100);
			this.logos	= this.rootElement.find('.logo');
			this.quotes	= this.rootElement.find('.quote');
		}

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

		setTimeout(() => this.logos.eq(itemNumber).
			add(this.quotes.eq(itemNumber)).
			addClass(Carousel.activeClass)
		, 600);

		this.itemNumber	= itemNumber + 1;
		if (this.itemNumber >= this.logos.length) {
			this.itemNumber	= 0;
		}

		this.counter	= this.quotes.eq(itemNumber).text().length + 10;
	}

	/**
	 * @param rootElement
	 * @param callback
	 */
	public constructor (
		private rootElement: JQuery,
		callback: Function = () => {}
	) { (async () => {
		await this.setItem(0);
		callback();

		setInterval(() => {
			if (this.rootElement.is(':appeared') && --this.counter <= 0) {
				this.setItem();
			}
		}, 50);
	})(); }
}
