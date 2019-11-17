import {IFile} from '../ifile';
import {IQuillDelta} from '../iquill-delta';
import {
	IAccountMessagingGroup,
	IAppointment,
	IEhrApiKey,
	IForm,
	IPassword,
	IRedoxPatient,
	IWallet
} from '../proto/types';

/** Any type of account "file". */
export type AccountFile =
	| IAccountMessagingGroup
	| IAppointment
	| IEhrApiKey
	| IFile
	| IForm
	| IQuillDelta
	| IQuillDelta[]
	| IPassword
	| IRedoxPatient
	| IWallet
	| File;
