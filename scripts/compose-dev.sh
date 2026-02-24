#!/usr/bin/env sh
set -eu

UID_VALUE="${UID:-$(id -u)}"
GID_VALUE="${GID:-$(id -g)}"

export UID="$UID_VALUE"
export GID="$GID_VALUE"

exec docker compose -f docker/compose.dev.yml "$@"