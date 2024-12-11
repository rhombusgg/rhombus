FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=denoland/deno:bin-2.1.3 /deno /usr/local/bin/deno
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release -p demo --recipe-path recipe.json
COPY . .
RUN cargo build --release --bin demo

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y openssl ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/demo /app/demo
COPY examples/demo/challenges /app/challenges
COPY examples/demo/config.yaml /app/config.yaml
COPY examples/demo/static /app/static
CMD ["/app/demo"]

EXPOSE 3000
