FROM rust:1.85 AS builder

WORKDIR /wasm

COPY ./wasm /wasm

RUN cargo install wasm-pack \
    && wasm-pack build --target web --release


FROM m3ng9i/ran:latest

COPY ./public /app/public
COPY --from=builder /wasm/pkg /app/public/wasm

EXPOSE 8080

WORKDIR /app/public

CMD [ "ran" ]
