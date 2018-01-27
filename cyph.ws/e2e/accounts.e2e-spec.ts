import {AccountsPage} from './accounts.po';


describe('Accounts', () => {
	let page: AccountsPage;

	beforeEach(() => {
		page	= new AccountsPage();
	});

	it('should display login page', async () => {
		await page.navigateTo();
		expect(await page.getLoginTitleText()).toEqual('Log in to Cyph');
	});
});
