FROM mcr.microsoft.com/devcontainers/javascript-node:24

USER root

RUN set -eu; \
    case "$(dpkg --print-architecture)" in \
        amd64) architecture=x64 ;; \
        arm64) architecture=arm64 ;; \
        *) echo "Unsupported architecture for VS Code CLI" >&2; exit 1 ;; \
    esac; \
    temporary_directory="$(mktemp -d)"; \
    trap 'rm -rf "$temporary_directory"' EXIT; \
    curl --fail --location --retry 3 \
        "https://update.code.visualstudio.com/latest/cli-linux-${architecture}/stable" \
        --output "$temporary_directory/vscode-cli.tar.gz"; \
    tar -xzf "$temporary_directory/vscode-cli.tar.gz" -C "$temporary_directory"; \
    install -m 0755 "$temporary_directory/code" /usr/local/bin/code-tunnel

USER node