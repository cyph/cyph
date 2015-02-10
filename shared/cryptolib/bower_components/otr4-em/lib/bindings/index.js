/*
 *  Off-the-Record Messaging bindings for node/javascript
 *  Copyright (C) 2012  Mokhtar Naamani,
 *                      <mokhtar.naamani@gmail.com>
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of version 2 of the GNU General Public License as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

var Module = require("../../build/libotr4.js");

var GcryptError = require("./error.js").GcryptError;
var OtrlUserState = require("./userstate.js").OtrlUserState;
var OtrlConnContext = require("./context.js").OtrlConnContext;
var OtrlMessageAppOps = require("./message.js").OtrlMessageAppOps;
var VirtualFileSystem = require("./vfs.js").VirtualFileSystem;

if (Module.init) {
	Module.init({
		OpsEvent: require("./message.js").ops_event,
		OtrlConnContext: OtrlConnContext
	});
} else {
	Module.ops_event = require("./message.js").ops_event;
	Module.ConnContext = OtrlConnContext;
}

var jsapi_ = Module.jsapi;
var otrl_ = Module.libotrl;

jsapi_.initialise();

module.exports = {
	UserState: OtrlUserState,
	ConnContext: OtrlConnContext,
	MessageAppOps: OtrlMessageAppOps,
	VFS: new VirtualFileSystem(),
	version: function () {
		return otrl_.version() + "-emscripten";
	},
	GcryptError: GcryptError
};
