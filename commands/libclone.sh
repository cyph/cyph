#!/bin/bash

repo="${1}"
outdir="${2}"

git clone \
	-b $(
		{
			echo master;
			git ls-remote --tags ${repo} |
				grep -v '{}' |
				awk -F'/' '{print $3}' |
				sort -V \
			;
		} | tail -n1
	) \
	--depth 1 \
	--recursive \
	${repo} \
	${outdir}

rm -rf ${outdir}/.git
