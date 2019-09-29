const {Menu, shell} = require('electron');


const menuItems = {
	about: {
		click: () => {
			shell.openExternal('https://www.cyph.com');
		},
		label: 'About Cyph'
	},
	closeWindow: {
		accelerator: 'CommandOrControl+W',
		click: () => {
			const focusedWindow = BrowserWindow.getFocusedWindow();
			if (focusedWindow) {
				focusedWindow.close();
			}
		},
		label: 'Close Window'
	},
	newWindow: {
		accelerator: 'CommandOrControl+N',
		click: () => createWindow(),
		label: 'New Window'
	},
	quit: {
		accelerator: 'CommandOrControl+Q',
		click: () => app.quit(),
		label: 'Quit Cyph'
	},
	separator: {type: 'separator'}
};


const menu = Menu.buildFromTemplate(
	process.platform === 'darwin' ?
		[
			{
				label: 'Menu',
				submenu: [
					menuItems.about,
					menuItems.separator,
					menuItems.quit
				]
			},
			{
				label: 'File',
				submenu: [
					menuItems.newWindow,
					menuItems.closeWindow
				]
			}
		] :
		[
			{
				label: 'File',
				submenu: [
					menuItems.newWindow,
					menuItems.closeWindow,
					menuItems.separator,
					menuItems.quit
				]
			},
			{
				label: 'Help',
				submenu: [
					menuItems.about
				]
			},
		]
);


Menu.setApplicationMenu(menu);
