/*
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

const fs = require('fs');
const path = require('path');
// Module to control application life, browser window and tray.
const {app, BrowserWindow, Menu, shell} = require('electron');
const {setup: setupPushReceiver} = require('electron-push-receiver');
// Electron settings from .json file.
const cdvElectronSettings = require('./cdv-electron-settings.json');
const electronRemote = require('@electron/remote/main');

electronRemote.initialize();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
	// Create the browser window.
	let appIcon;
	if (fs.existsSync(`${__dirname}/img/app.png`)) {
		appIcon = `${__dirname}/img/app.png`;
	}
	else if (fs.existsSync(`${__dirname}/img/icon.png`)) {
		appIcon = `${__dirname}/img/icon.png`;
	}
	else {
		appIcon = `${__dirname}/img/logo.png`;
	}

	const browserWindowOpts = Object.assign(
		{},
		cdvElectronSettings.browserWindow,
		{
			icon: appIcon,
			webPreferences: Object.assign(
				{},
				(cdvElectronSettings.browserWindow || {}).webPreferences,
				{
					preload: path.join(__dirname, 'preload.js')
				}
			)
		}
	);
	mainWindow = new BrowserWindow(browserWindowOpts);

	// and load the index.html of the app.
	// TODO: possibly get this data from config.xml
	mainWindow.loadURL(`file://${__dirname}/index.html`);

	setupPushReceiver(mainWindow.webContents);
	electronRemote.enable(mainWindow.webContents);

	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.send('window-id', mainWindow.id);
	});

	// Open the DevTools.
	if (cdvElectronSettings.browserWindow.webPreferences.devTools) {
		mainWindow.webContents.openDevTools();
	}

	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

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
	window: {
		label: 'Window',
		submenu: [
			{role: 'minimize'},
			...(process.platform !== 'darwin' ?
				[] :
				[menuItems.separator, {role: 'front'}])
		]
	}
};

const menu = Menu.buildFromTemplate(
	process.platform === 'darwin' ?
		[
			{
				label: 'Menu',
				submenu: [menuItems.about, menuItems.separator, menuItems.quit]
			},
			{
				label: 'File',
				submenu: [menuItems.newWindow, menuItems.closeWindow]
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
				submenu: [menuItems.about]
			}
		]
);

Menu.setApplicationMenu(menu);
