/**
 * Wrapper for AWS SDK.
 */
export class AWS {
	/**
	 * Signs and sends an AWS API request.
	 * (http://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html)
	 * @param o
	 * @param callback
	 */
	public static request (o: any, callback: any = () => {}) : void {}
}
