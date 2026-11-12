FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Firefox (current release) from Mozilla's official APT repository,
# plus Python for build.py and CJK fonts for gallery titles.
RUN install -d -m 0755 /etc/apt/keyrings \
    && wget -q https://packages.mozilla.org/apt/repo-signing-key.gpg -O /etc/apt/keyrings/packages.mozilla.org.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" \
        > /etc/apt/sources.list.d/mozilla.list \
    && printf 'Package: *\nPin: origin packages.mozilla.org\nPin-Priority: 1000\n' > /etc/apt/preferences.d/mozilla \
    && apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends firefox python3 fonts-noto-cjk \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
