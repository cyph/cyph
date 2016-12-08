import {util} from '../util';
import {Elements} from './elements';


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
	public async setItem (itemNumber: number = this.itemNumber) : Promise<number> {
		if (!this.logos || !this.quotes) {
			this.logos	= await Elements.waitForElement(
				() => this.rootElement.find('.logo')
			);

			this.quotes	= await Elements.waitForElement(
				() => this.rootElement.find('.quote')
			);

			await util.sleep(1000);
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

		return timeout;
	}

	constructor (
		/** @ignore */
		private readonly rootElement: JQuery,

		callback: Function = () => {}
	) { (async () => {
		const timeout	= await this.setItem(0);
		callback();
		await util.sleep(timeout);

		while (true) {
			await util.sleep(
				this.rootElement.is(':appeared') ?
					(await this.setItem()) :
					500
			);
		}
	})(); }
}
