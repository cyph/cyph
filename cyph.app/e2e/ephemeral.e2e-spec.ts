import {EphemeralPage} from './ephemeral.po';


describe('Ephemeral chat', () => {
	let page: EphemeralPage;

	beforeEach(async (done) => {
		page	= new EphemeralPage();
		await page.navigateTo();
		done();
	});

	it('should display footer', async () => {
		expect(await page.getFooterText()).toEqual('© Cyph 2018');
	});
});
