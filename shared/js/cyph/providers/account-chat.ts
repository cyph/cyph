import {AccountChatService} from '../services/account-chat.service';
import {AccountP2PService} from '../services/account-p2p.service';
import {AccountSessionCapabilitiesService} from '../services/account-session-capabilities.service';
import {AccountSessionInitService} from '../services/account-session-init.service';
import {AccountSessionService} from '../services/account-session.service';
import {ChannelService} from '../services/channel.service';
import {ChatMessageGeometryService} from '../services/chat-message-geometry.service';
import {ChatService} from '../services/chat.service';
import {AccountCastleService} from '../services/crypto/account-castle.service';
import {CastleService} from '../services/crypto/castle.service';
import {CyphertextService} from '../services/cyphertext.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PWebRTCService} from '../services/p2p-webrtc.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionCapabilitiesService} from '../services/session-capabilities.service';
import {SessionInitService} from '../services/session-init.service';
import {SessionService} from '../services/session.service';


export const accountChatProviders	= [
	AccountChatService,
	AccountSessionService,
	AccountSessionCapabilitiesService,
	AccountSessionInitService,
	ChannelService,
	ChatMessageGeometryService,
	CyphertextService,
	FileTransferService,
	P2PWebRTCService,
	ScrollService,
	{
		provide: CastleService,
		useClass: AccountCastleService
	},
	{
		provide: ChatService,
		useExisting: AccountChatService
	},
	{
		provide: P2PService,
		useClass: AccountP2PService
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
