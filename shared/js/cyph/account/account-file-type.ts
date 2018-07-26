import {IFile} from '../ifile';
import {IQuillDelta} from '../iquill-delta';
import {IAppointment, IEhrApiKey, IForm, IRedoxPatient, IWallet} from '../proto';


/** Any type of account "file". */
export type AccountFile	=
	IAppointment|
	IEhrApiKey|
	IFile|
	IForm|
	IQuillDelta|
	IQuillDelta[]|
	IRedoxPatient|
	IWallet|
	File
;
