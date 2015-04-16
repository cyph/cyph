			let notifyTitle			= 'Cyph';
			let notifyIcon			= '/img/favicon/apple-touch-icon-180x180.png';
			let notifyAudio			= new Audio('/audio/beep.mp3');
			let disableNotify		= false;
			let openNotifications	= [];

			notify	= (message) => {
				if (!disableNotify && Visibility.hidden()) {
					if (window.Notification) {
						let notification	= new Notification(notifyTitle, {body: message, icon: notifyIcon});

						openNotifications.push(notification);

						notification.onclose	= () => {
							while (openNotifications.length > 0) {
								openNotifications.pop().close();
							}

							if (Visibility.hidden()) {
								disableNotify	= true;
							}
						};

						notification.onclick	= () => {
							window.focus();
							notification.onclose();
						};
					}

					notifyAudio.play();

					if (navigator.vibrate) {
						navigator.vibrate(200);
					}
				}
			};


			if (window.Notification) {
				Notification.requestPermission();
			}