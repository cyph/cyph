/**
 * Chat-specific UI elements.
 */
export interface IElements {
	readonly buttons: () => JQuery;
	readonly cyphertext: () => JQuery;
	readonly everything: () => JQuery;
	readonly messageBox: () => JQuery;
	readonly messageList: () => JQuery;
	readonly messageListInner: () => JQuery;
	readonly p2pFriendPlaceholder: () => JQuery;
	readonly p2pFriendStream: () => JQuery;
	readonly p2pMeStream: () => JQuery;
	readonly sendButton: () => JQuery;
	readonly title: () => JQuery;
}
