import {LocalAsyncValue} from '../local-async-value';
import {IAccountUserProfileExtra} from '../proto';


/** Temporary dummy data. */
export const profileExtraTemp	= new LocalAsyncValue<IAccountUserProfileExtra>({
	address: '1600 Pennsylvania Ave NW, Washington, DC 20500, United States',
	education: [
		{
			detail: 'Ontology, PhD',
			endDate: -221500800000,
			locationName: 'Yale University',
			locationURL: 'yale.edu',
			startDate: -362250000000
		},
		{
			detail: 'Medicine, MD',
			endDate: 1513152000000,
			locationName: 'Vivek Wadhwa University',
			locationURL: 'vivek.edu',
			startDate: 707036400000
		},
		{
			detail: 'Doctor of Medicine',
			endDate: 1513152000000,
			locationName: 'University of California, Los Angeles',
			locationURL: '',
			startDate: 707036400000
		},
		{
			detail: 'Medicine, MD',
			endDate: 1513152000000,
			locationName: 'Vivek Wadhwa University',
			locationURL: 'vivek.edu',
			startDate: 707036400000
		}
	],
	gender: 'Male',
	insurance: {data: [
		'Blue Cross Blue Shield Federal Employee Program',
		'Anthem Blue Cross Blue Shield',
		'Virginia Health Network'
	]},
	languages: [
		{
			language: 'English',
			proficiency: 3
		},
		{
			language: 'German',
			proficiency: 2
		},
		{
			language: 'Farsi',
			proficiency: 1
		},
		{
			language: 'Spanish',
			proficiency: 0
		}
	],
	npi: {data: [
		'0123456789'
	]},
	specialties: {data: [
		'Internist',
		'Primary Care Doctor',
		'Oncology'
	]},
	work: [
		{
			detail: 'CEO',
			locationName: 'SpaceX',
			locationURL: 'spacex.com',
			startDate: 1022914800000
		}
	]
});
