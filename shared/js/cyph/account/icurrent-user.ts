import {IKeyPair} from '../../proto';
import {User} from './user';


export interface ICurrentUser {
	keys: {
		encryptionKeyPair: IKeyPair;
		signingKeyPair: IKeyPair;
		symmetricKey: Uint8Array;
	};
	user: User;
}
