import {CyphPage} from './app.po';

describe('cyph.com', () => {
	let page: CyphPage;

	beforeEach(() => {
		page = new CyphPage();
	});

	it('should display footer', async () => {
		page.navigateTo();
		expect(await page.getParagraphText()).toEqual('© Cyph 2022');
	});
});
