import {IFile} from '../ifile';
import {IQuillDelta} from '../iquill-delta';
import {
	IAccountMessagingGroup,
	IAppointment,
	IEhrApiKey,
	IEmailMessage,
	IForm,
	IPassword,
	IPGPKey,
	IRedoxPatient,
	IWallet
} from '../proto/types';

/** Any type of account "file". */
export type AccountFile =
	| IAccountMessagingGroup
	| IAppointment
	| IEhrApiKey
	| IEmailMessage
	| IFile
	| IForm
	| IQuillDelta
	| IQuillDelta[]
	| IPassword
	| IPGPKey
	| IRedoxPatient
	| IWallet
	| Blob;
