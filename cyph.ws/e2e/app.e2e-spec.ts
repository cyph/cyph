import {Cyph.WsPage} from './app.po';


describe('cyph.ws App', () => {
	let page: Cyph.WsPage;

	beforeEach(() => {
		page = new Cyph.WsPage();
	});

	it('should display message saying app works', () => {
		page.navigateTo();
		expect(page.getParagraphText()).toEqual('app works!');
	});
});
