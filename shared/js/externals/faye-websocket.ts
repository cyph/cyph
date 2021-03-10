/* eslint-disable */

/** @file faye-websocket external. */

export default (<any> self).IS_WEB ?
	{Client: (<any> self).WebSocket} :
	eval('require')('faye-websocket').default;
