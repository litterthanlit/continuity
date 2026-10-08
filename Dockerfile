# syntax=docker/dockerfile:1.7
#
# Continuity in a box: Node 22, a pinned headless Chrome, ffmpeg and fonts — the
# same toolchain everywhere, so stills, checks and renders match between a laptop,
# CI and a render box.
#
#   toolchain  Node + pinned chrome-headless-shell + ffmpeg + git + corepack (pnpm).
#              No ct. For CI jobs in repos that install @litterthanlit/continuity
#              themselves (`container: ghcr.io/litterthanlit/continuity:<v>-toolchain`).
#   ct         toolchain + the ct CLI from this checkout, installed from the lockfile
#              (the default target). Mount a repo at /work and run `ct` commands.
#
#   docker build -t continuity .
#   docker build --target toolchain -t continuity:toolchain .
#   docker run --rm -v "$PWD:/work" continuity render my-video
#
# The Chrome build is pinned through Playwright: PLAYWRIGHT_VERSION 1.56.1 →
# chromium_headless_shell-1194 (Chromium 141.0.7390.37), the build the golden frames
# in tests/golden were made with. Bump it deliberately, together with the goldens.

ARG BASE=node:22-bookworm-slim

FROM ${BASE} AS toolchain
ARG PLAYWRIGHT_VERSION=1.56.1
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    HYPERFRAMES_NO_TELEMETRY=1 \
    HYPERFRAMES_NO_UPDATE_CHECK=1 \
    DO_NOT_TRACK=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
# --with-deps installs Chrome's shared libraries and Playwright's font set (Noto color
# emoji, Liberation, CJK) for glyph fallback; Continuity's own fonts ship in the package.
# Mounted repos belong to the host user, so git gets safe.directory '*'.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates ffmpeg git \
 && npx -y "playwright@${PLAYWRIGHT_VERSION}" install --with-deps --only-shell chromium \
 && chmod -R a+rX "$PLAYWRIGHT_BROWSERS_PATH" \
 && corepack enable \
 && git config --system --add safe.directory '*' \
 && rm -rf /var/lib/apt/lists/* /root/.npm /tmp/*

FROM toolchain AS ct
ARG VERSION=dev
WORKDIR /opt/continuity
COPY package.json pnpm-lock.yaml ./
# Production dependencies only, exactly as locked (the `link:.` self-dependency is a dev one).
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile --config.package-import-method=copy \
 && rm -rf /root/.cache /root/.npm
COPY bin ./bin
COPY src ./src
COPY templates ./templates
COPY plugin/skills ./plugin/skills
COPY README.md LICENSE NOTICE ./
RUN ln -s /opt/continuity/bin/ct.mjs /usr/local/bin/ct

LABEL org.opencontainers.image.title="continuity" \
      org.opencontainers.image.description="Motion design videos as code, for agents — the ct CLI with a pinned headless Chrome and ffmpeg." \
      org.opencontainers.image.source="https://github.com/litterthanlit/continuity" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}"

# uid 1000 matches the first user on most Linux hosts; others run with
# --user "$(id -u):$(id -g)" (HOME points somewhere any uid can write).
ENV HOME=/tmp
USER node
WORKDIR /work
ENTRYPOINT ["ct"]
CMD ["--help"]
