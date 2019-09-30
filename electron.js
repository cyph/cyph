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

const menuSections = {
	edit: {
		role: 'editMenu'
		/*
			label: 'Edit',
			submenu: [
				{accelerator: 'CmdOrCtrl+Z', role: 'undo'},
				{accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo'},
				menuItems.separator,
				{accelerator: 'CmdOrCtrl+X', role: 'cut'},
				{accelerator: 'CmdOrCtrl+C', role: 'copy'},
				{accelerator: 'CmdOrCtrl+V', role: 'paste'},
				{accelerator: 'CmdOrCtrl+Shift+V', role: 'pasteAndMatchStyle'},
				{accelerator: 'CmdOrCtrl+A', role: 'selectAll'}
			]
		*/
	},
	window: {role: 'windowMenu'}
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
			},
			menuSections.edit,
			menuSections.window
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
			menuSections.edit,
			menuSections.window,
			{
				label: 'Help',
				submenu: [
					menuItems.about
				]
			},
		]
);


Menu.setApplicationMenu(menu);
