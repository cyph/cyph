/**
 * Chat-specific UI elements.
 */
export interface IElements {
	readonly cyphertext: () => JQuery;
	readonly everything: () => JQuery;
	readonly messageList: () => JQuery;
	readonly messageListInner: () => JQuery;
	readonly p2pFriendStream: () => JQuery;
	readonly p2pMeStream: () => JQuery;
	readonly title: () => JQuery;
}
