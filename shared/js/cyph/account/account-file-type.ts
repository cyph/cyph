
import {IQuillDelta} from '../iquill-delta';
import {IAppointment, IEhrApiKey, IForm, IRedoxPatient} from '../proto';


/** Any type of account "file". */
export type AccountFile	=
	IAppointment|
	IEhrApiKey|
	IForm|
	IQuillDelta|
	IQuillDelta[]|
	IRedoxPatient|
	File
;
