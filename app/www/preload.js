/* Adapted from https://github.com/electron/electron/issues/16513#issuecomment-602070250 */

const {desktopCapturer} = require('electron');

window.navigator.mediaDevices.getDisplayMedia = async () =>
	new Promise(async (resolve, reject) => {
		try {
			const sources = await desktopCapturer.getSources({
				types: ['screen', 'window']
			});

			const selectionElem = document.createElement('div');
			selectionElem.classList = 'desktop-capturer-selection';

			selectionElem.innerHTML = `
				<div class="desktop-capturer-selection__scroller">
					<ul class="desktop-capturer-selection__list">
						${sources
							.map(
								({
									id,
									name,
									thumbnail,
									display_id,
									appIcon
								}) => `
									<li class="desktop-capturer-selection__item">
										<button
											class="desktop-capturer-selection__btn"
											data-id="${id}"
											title="${name}"
										>
											<img
												class="desktop-capturer-selection__thumbnail"
												src="${thumbnail.toDataURL()}"
											/>
											<span class="desktop-capturer-selection__name">
												${name}
											</span>
										</button>
									</li>
							`
							)
							.join('')}
					</ul>
				</div>
				<button class="desktop-capturer-cancel__btn desktop-capturer-selection__btn">
					Cancel
				</button>
				<style>
					.desktop-capturer-selection {
						position: fixed;
						top: 0;
						left: 0;
						width: 100%;
						height: 100vh;
						background: rgba(30, 30, 30, 0.75);
						color: white;
						z-index: 10000000;
						display: flex;
						align-items: center;
						justify-content: center;
					}
					.desktop-capturer-selection__scroller {
						width: 100%;
						max-height: 100vh;
						overflow-y: auto;
					}
					.desktop-capturer-selection__list {
						max-width: calc(100% - 100px);
						margin: 50px;
						padding: 0;
						display: flex;
						flex-wrap: wrap;
						list-style: none;
						overflow: hidden;
						justify-content: center;
					}
					.desktop-capturer-selection__item {
						display: flex;
						margin: 4px;
					}
					.desktop-capturer-selection__btn {
						display: flex;
						flex-direction: column;
						align-items: stretch;
						width: 145px;
						margin: 0;
						border: 0;
						border-radius: 3px;
						padding: 4px;
						background: #252626;
						text-align: left;
						transition: background-color 0.15s, box-shadow 0.15s;
					}
					.desktop-capturer-selection__btn:hover,
					.desktop-capturer-selection__btn:focus {
						background: rgba(98, 100, 167, 0.8);
					}
					.desktop-capturer-cancel__btn {
						background: white;
						color: rgba(30, 30, 30, 0.75);
						text-align: center;
						margin-right: 32px;
						padding: 8px 4px;
						outline: none;
					}
					.desktop-capturer-selection__thumbnail {
						width: 100%;
						height: 81px;
						object-fit: cover;
					}
					.desktop-capturer-selection__name {
						margin: 6px 0 6px;
						white-space: nowrap;
						text-overflow: ellipsis;
						overflow: hidden;
						color: white;
					}
				</style>
			`;

			document.body.appendChild(selectionElem);

			document
				.querySelectorAll(
					'.desktop-capturer-selection__btn:not(.desktop-capturer-cancel__btn)'
				)
				.forEach(button => {
					button.addEventListener('click', async () => {
						try {
							const id = button.getAttribute('data-id');
							const source = sources.find(
								source => source.id === id
							);
							if (!source) {
								throw new Error(
									`Source with id ${id} does not exist`
								);
							}

							const stream = await window.navigator.mediaDevices.getUserMedia(
								{
									audio: false,
									video: {
										mandatory: {
											chromeMediaSource: 'desktop',
											chromeMediaSourceId: source.id
										}
									}
								}
							);
							resolve(stream);

							selectionElem.remove();
						}
						catch (err) {
							console.error(
								'Error selecting desktop capture source:',
								err
							);
							reject(err);
						}
					});
				});

			document
				.querySelectorAll('.desktop-capturer-cancel__btn')
				.forEach(button => {
					button.addEventListener('click', () => {
						reject(new Error('Permission denied'));
						selectionElem.remove();
					});
				});
		}
		catch (err) {
			console.error('Error displaying desktop capture sources:', err);
			reject(err);
		}
	});
