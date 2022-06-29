#!/bin/bash


input="$(echo "${1}" | sed 's|\.scss$||')"
shift

output="$(echo "${1}" | sed 's|\.css$||')"
shift

if [ ! "${output}" ] ; then
	output="${f}"
fi

sassRoot="$(mktemp -d)"
distPath="${sassRoot}/.sass.dist"
webpackPath="${sassRoot}/.sass.webpack.js"

cat > "${webpackPath}" <<- EOM
	const MiniCssExtractPlugin = require('mini-css-extract-plugin');

	module.exports = {
		entry: {
			index: '$(realpath "${input}.scss")'
		},
		output: {
			path: '${distPath}'
		},
		mode: 'none',
		module: {
			rules: [
				{
					test: /\.scss$/,
					use: [
						MiniCssExtractPlugin.loader,
						{
							loader: 'css-loader',
							options: {
								url: false
							}
						},
						'sass-loader'
					]
				}
			]
		},
		plugins: [new MiniCssExtractPlugin()]
	};
EOM

echo "sass ${input}.scss ${output}.css"

webpack --config "${webpackPath}"
mv "${distPath}/index.css" "${output}.css"
rm -rf "${sassRoot}"

test -f "${output}.css"
