/** Value-containing-object track by function. */
export const trackByValue = <T extends {value: number | string}>(
	_I: number,
	item: T
) => item.value;
