import {EphemeralPage} from './ephemeral.po';


describe('Ephemeral chat', () => {
	let page: EphemeralPage;

	beforeEach(() => {
		page	= new EphemeralPage();
	});

	it('should display footer', async () => {
		await page.navigateTo();
		expect(await page.getFooterText()).toEqual('© Cyph 2018');
	});
});
