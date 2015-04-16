
			public alertDialog (o, callback) {
				$mdDialog.show($mdDialog.alert(o)).then(callback);
			}

			public baseDialog (o, callback) {

			}

			public confirmDialog (o, callback, opt_timeout) {
				let promise	= $mdDialog.show($mdDialog.confirm(o));

				let timeoutId;
				if (opt_timeout) {
					timeoutId	= setTimeout(() => {
						$mdDialog.cancel(promise);
					}, opt_timeout);
				}

				let f: Function	= (ok) {
					timeoutId && clearTimeout(timeoutId);
					callback && callback(ok === true);
				}

				promise.then(f).catch(f);
			}

			public toast (o, callback) {

			}




