/**
 * @file Custom jQuery plugins.
 */


/**
 * Calculate number of pixels user has scrolled relative to this element.
 */
/* tslint:disable-next-line:only-arrow-functions */
$.fn.scrollPosition	= function (this: HTMLElement) : number {
	/* tslint:disable-next-line:no-invalid-this */
	const $this: JQuery	= $(this);

	return $this[0].scrollHeight -
	(
		$this[0].scrollTop +
		$this[0].clientHeight
	);
};
