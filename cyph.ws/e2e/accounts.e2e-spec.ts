import {AccountsPage} from './accounts.po';


describe('Accounts', () => {
	let page: AccountsPage;

	beforeEach(async (done) => {
		page	= new AccountsPage();
		await page.navigateTo();
		done();
	});

	it('has title', async () => {
		expect(await page.getPageTitle()).toEqual('Cyph – Encrypted Messenger');
	});

	it('displays login page', async () => {
		expect(await page.getLoginTitleText()).toEqual('Log in to Cyph');
	});

	it('logs in', async () => {
		await page.logIn();
		expect(await page.elements.menu.root().isPresent()).toBe(true);
		expect(await page.elements.profile.root().isPresent()).toBe(true);
	});

	/* TODO: Make concurrency-safe */
	it('uploads file', async () => {
		await page.logIn();
		console.log('logged in');
		page.clickElement(page.elements.menu.files);
		await page.deleteAllFiles();
		console.log('deleted all files');
		expect(await page.elements.files.firstFile().isPresent()).toBe(false);
		console.log('uploading file');
		await page.elements.files.upload().sendKeys(page.filePath);
		console.log('uploaded file');
		await page.waitForElement(page.elements.files.firstFile);
		console.log('waited for file list item');
		expect(await page.elements.files.firstFile().isPresent()).toBe(true);
	});
});
