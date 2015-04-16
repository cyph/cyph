			protected static buttonLock: boolean		= false;

			public baseButtonClick (callback) {
				if (!this.buttonLock) {
					this.buttonLock	= true;

					setTimeout(() => {
						if (Cyph.Env.isMobile) {
							$mdSidenav('menu').close();
						}

						this.controller.update(callback);

						setTimeout(() => {
							this.buttonLock	= false;
						});
					}, 250);
				}
			}