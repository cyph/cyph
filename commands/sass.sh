#!/bin/bash


eval "$(parseArgs \
	--opt input-data \
	--opt load-path \
	--opt out \
	--pos input \
)"


inputData="${_arg_input_data}"
input="$(echo "${_arg_input}" | perl -pe 's/\.s?css$//')"
loadPath="${_arg_load_path}"
output="$(echo "${_arg_out}" | perl -pe 's/\.s?css$//')"

sassRoot="$(mktemp -d)"
distPath="${sassRoot}/dist"
webpackPath="${sassRoot}/webpack.js"

if [ ! "${output}" ] ; then
	output="${input}"
fi

if [ "${inputData}" ] ; then
	input="${sassRoot}/input"
	echo "${inputData}" > "${input}.scss"
fi

if [ "${loadPath}" ] ; then
	newInput="${loadPath}/.$(node -e 'console.log(crypto.randomBytes(32).toString("hex"))').tmp"
	cp "${input}.scss" "${newInput}.scss"
	input="${newInput}"
fi

cat > "${webpackPath}" <<- EOM
	const MiniCssExtractPlugin = require('mini-css-extract-plugin');
	const path = require('path');

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

if [ "${loadPath}" ] ; then
	rm "${input}.scss"
fi

test -f "${output}.css"
