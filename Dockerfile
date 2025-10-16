FROM rust:1.90 AS builder
WORKDIR /app
COPY --from=denoland/deno:bin-2.1.3 /deno /usr/local/bin/deno
COPY Cargo.toml Cargo.lock ./
COPY rhombus/Cargo.toml rhombus/Cargo.toml
COPY rhombus-build/Cargo.toml rhombus-build/Cargo.toml
COPY examples/demo/Cargo.toml examples/demo/Cargo.toml
RUN mkdir -p rhombus/src && touch rhombus/src/lib.rs
RUN mkdir -p rhombus-build/src && touch rhombus-build/src/lib.rs
RUN mkdir -p examples/demo/src && printf 'fn main() {}' > examples/demo/src/main.rs
RUN mkdir -p rhombus-cli/src && printf '[package]\nname = "rhombus-cli"\nedition = "2021"' > rhombus-cli/Cargo.toml && touch rhombus-cli/src/main.rs
RUN mkdir -p examples/standalone/src && printf '[package]\nname = "standalone"\nedition = "2021"' > examples/standalone/Cargo.toml && touch examples/standalone/src/main.rs
RUN mkdir -p examples/plugin/src && printf '[package]\nname = "plugin"\nedition = "2021"' > examples/plugin/Cargo.toml && touch examples/plugin/src/lib.rs
RUN mkdir -p examples/external-plugin/src && printf '[package]\nname = "external-plugin"\nedition = "2021"' > examples/external-plugin/Cargo.toml && touch examples/external-plugin/src/main.rs
RUN cargo build --release --bin demo
COPY rhombus-build rhombus-build
COPY examples/demo examples/demo
COPY rhombus rhombus
RUN cargo build --release --bin demo

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y openssl ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/demo /app/demo
COPY examples/demo/challenges /app/challenges
COPY examples/demo/static /app/static
COPY examples/demo/config.yaml /app/config.yaml
CMD ["/app/demo"]

EXPOSE 3000
