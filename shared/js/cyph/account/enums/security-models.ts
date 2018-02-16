/**
 * Different types of security depending on a particular datum's threat model.
 */
export enum SecurityModels {
	private,
	privateSigned,
	public,
	publicFromOtherUsers,
	unprotected
}
