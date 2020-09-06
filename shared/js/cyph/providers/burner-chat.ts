import {ChannelService} from '../services/channel.service';
import {ChatEnvService} from '../services/chat-env.service';
import {ChatMessageService} from '../services/chat-message.service';
import {ChatService} from '../services/chat.service';
import {AnonymousCastleService} from '../services/crypto/anonymous-castle.service';
import {CastleService} from '../services/crypto/castle.service';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';
import {EphemeralSessionService} from '../services/ephemeral-session.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PWebRTCService} from '../services/p2p-webrtc.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionWrapperService} from '../services/session-wrapper.service';
import {SessionService} from '../services/session.service';

/** Providers for chats in an Burner context. */
export const burnerChatProviders = [
	ChannelService,
	ChatService,
	ChatMessageService,
	CyphertextService,
	FileTransferService,
	P2PService,
	P2PWebRTCService,
	ScrollService,
	SessionWrapperService,
	{
		provide: CastleService,
		useClass: AnonymousCastleService
	},
	{
		provide: EnvService,
		useClass: ChatEnvService
	},
	{
		provide: SessionService,
		useClass: EphemeralSessionService
	}
];
