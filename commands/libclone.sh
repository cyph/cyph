#!/bin/bash


repo="${1}"
outdir="${2}"
branch="${3}"

mkdir -p ${outdir}

git clone \
	-b $(
		if [ "${branch}" ] ; then
			echo "${branch}"
		else
			{
				echo master;
				git ls-remote --tags ${repo} |
					grep -v '{}' |
					awk -F'/' '{print $3}' |
					sort -V \
				;
			} | tail -n1
		fi
	) \
	--depth 1 \
	--recursive \
	${repo} \
	${outdir}

rm -rf ${outdir}/.git
