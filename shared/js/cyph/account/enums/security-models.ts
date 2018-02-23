/**
 * Different types of security depending on a particular datum's threat model.
 *
 * ---
 *
 * `private`: Encrypted for the current user and stored privately.
 *
 * `privateSigned`: Encrypted and signed for/by the current user and stored privately.
 *
 * `public`: Signed by the current user and shared publicly.
 *
 * `publicFromOtherUsers`: Accepts data signed by other users.
 *
 * `unprotected`: No end-to-end cryptographic protection. Use ONLY for server-generated data.
 */
export enum SecurityModels {
	private,
	privateSigned,
	public,
	publicFromOtherUsers,
	unprotected
}
