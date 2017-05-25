import {Injectable} from '@angular/core';
import {INote} from '../notes/inote';
import {AccountAuthService} from './account-auth.service';


/**
 * Account notes service.
 */
@Injectable()
export class AccountNotesService {
	/** @ignore */
	private static DUMMY_NOTES: INote[]	= [
		{title: 'Note Title', contents: 'Note Contents'},
		{title: 'Deconstructing Marx: Debordist situation in the works of Joyce',
		contents:
				'The characteristic theme of Prinn’s analysis of\
				Lyotardist narrative is not construction, as Lacan would have it, but\
				preconstruction. Therefore, Lyotard promotes the use of Debordist situation to\
				modify society. Bataille uses the term ‘neocultural dialectic theory’ to denote\
				the role of the writer as artist.\
				\
				In the works of Fellini, a predominant concept is the distinction between\
				without and within. Thus, Sartre suggests the use of neotextual narrative to\
				challenge class divisions. The meaninglessness, and some would say the genre,\
				of neocultural dialectic theory intrinsic to Fellini’s 8 1/2 emerges\
				again in Amarcord.\
				\
				However, the premise of dialectic materialism suggests that reality is used\
				to marginalize the underprivileged. The primary theme of the works of Fellini\
				is a self-sufficient whole.\
				\
				In a sense, many narratives concerning the role of the participant as artist\
				exist. Baudrillard promotes the use of neocultural dialectic theory to\
				deconstruct and analyse class.\
				\
				Therefore, Sartre uses the term ‘the subtextual paradigm of narrative’ to\
				denote the economy, and subsequent genre, of cultural sexual identity. The\
				subject is interpolated into a Debordist situation that includes sexuality as a\
				totality.\
				\
				However, Debord uses the term ‘postcapitalist construction’ to denote not,\
				in fact, deappropriation, but predeappropriation. Neocultural dialectic theory\
				states that the goal of the reader is social comment, given that the premise of\
				Lyotardist narrative is valid.'
			}
	];

	/** Files owned by current user. */
	public get myNotes () : INote[] {
		if (!this.accountAuthService.current) {
			return [];
		}

		return AccountNotesService.DUMMY_NOTES;
	}

	public noteSnippet (note: string, limit: number) : string {
		if (!this.accountAuthService.current) {
			return "";
		}
		return (note.length > limit) ? note.substr(0, (limit-1)) + '...' : note;
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService
	) {}
}
