#!/bin/sh
(trap 'kill 0' SIGINT; cd server && npm run start & cd ui && npm run start)
