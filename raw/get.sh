#!/bin/zsh
# usage: get.sh <id> <out-path-without-ext> [width]
id=$1; out=$2; w=${3:-1200}
mkdir -p "public/images/$(dirname $out)"
curl -sL "https://www.trybloom.ai/img/$id" -o "raw/$id.png" && magick "raw/$id.png" -resize "${w}x>" -quality 80 "public/images/$out.webp" && echo "ok $out"
