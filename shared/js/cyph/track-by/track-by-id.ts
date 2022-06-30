/** ID-containing-object track by function. */
export const trackByID = <T extends {id: string}>(_I: number, item: T) =>
	item.id;
