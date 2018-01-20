import {translate} from '../../util/translate';


/** @see CalendarInviteComponent.reasons */
export const calendarInviteReasons	= [
	'Annual Physical',
	'Illness',
	'Consultation',
	'Follow Up',
	'Rx/Refill',
	'Second Opinion',
	'Checkup',
	'Diagnostic Tests: Imaging Request (X-ray, CT, MRI)',
	'Diagnostic Tests: Imaging Review (X-ray, CT, MRI)',
	'Diagnostic Tests: Blood Work/Lab Tests',
	'Diagnostic Tests: Blood Work/Lab Results Review',
	'Injury'
].map(
	/* Temporary workaround for https://github.com/palantir/tslint/issues/2430 */
	/* tslint:disable-next-line:no-unnecessary-callback-wrapper */
	s => translate(s)
);
