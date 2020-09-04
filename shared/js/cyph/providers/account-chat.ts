import {AccountChatEnvService} from '../services/account-chat-env.service';
import {AccountChatService} from '../services/account-chat.service';
import {AccountP2PService} from '../services/account-p2p.service';
import {AccountSessionCapabilitiesService} from '../services/account-session-capabilities.service';
import {AccountSessionInitService} from '../services/account-session-init.service';
import {AccountSessionService} from '../services/account-session.service';
import {ChannelService} from '../services/channel.service';
import {ChatMessageService} from '../services/chat-message.service';
import {ChatService} from '../services/chat.service';
import {AccountCastleService} from '../services/crypto/account-castle.service';
import {CastleService} from '../services/crypto/castle.service';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PWebRTCService} from '../services/p2p-webrtc.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionCapabilitiesService} from '../services/session-capabilities.service';
import {SessionWrapperService} from '../services/session-wrapper.service';
import {SessionInitService} from '../services/session-init.service';
import {SessionService} from '../services/session.service';

/** Providers for chats in an Accounts context. */
export const accountChatProviders = [
	AccountChatService,
	AccountP2PService,
	AccountSessionService,
	AccountSessionCapabilitiesService,
	AccountSessionInitService,
	ChannelService,
	ChatMessageService,
	CyphertextService,
	FileTransferService,
	P2PWebRTCService,
	ScrollService,
	SessionWrapperService,
	{
		provide: CastleService,
		useClass: AccountCastleService
	},
	{
		provide: ChatService,
		useExisting: AccountChatService
	},
	{
		provide: EnvService,
		useClass: AccountChatEnvService
	},
	{
		provide: P2PService,
		useExisting: AccountP2PService
	},
	{
		provide: SessionService,
		useExisting: AccountSessionService
	},
	{
		provide: SessionCapabilitiesService,
		useExisting: AccountSessionCapabilitiesService
	},
	{
		provide: SessionInitService,
		useExisting: AccountSessionInitService
	}
];
