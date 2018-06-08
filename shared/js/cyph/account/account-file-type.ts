
import {IQuillDelta} from '../iquill-delta';
import {IAppointment, IEhrApiKey, IForm, IRedoxPatient, IWallet} from '../proto';


/** Any type of account "file". */
export type AccountFile	=
	IAppointment|
	IEhrApiKey|
	IForm|
	IQuillDelta|
	IQuillDelta[]|
	IRedoxPatient|
	IWallet|
	File
;
