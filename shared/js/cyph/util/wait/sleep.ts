/** Sleep for the specifed amount of time. */
export const sleep = async (ms: number = 250) : Promise<void> => {
	return new Promise<void>(resolve => {
		/* tslint:disable-next-line:ban */
		setTimeout(() => {
			resolve();
		}, ms);
	});
};
