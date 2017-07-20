/** Steps of pairwise session handshake. */
export enum HandshakeSteps {
	Aborted = 4,
	Complete = 3,
	PostCoreInit = 1,
	PostMutualVerification = 2,
	Start = 0
}
