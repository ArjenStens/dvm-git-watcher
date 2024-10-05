FROM denoland/deno:latest


WORKDIR /app

ADD . /app

# TODO: install ngit

RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-env", "--allow-all", "--allow-read", "--allow-run", "main.ts"]

