FROM rust:1.70-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /root/

# Copy the binary
COPY --from=builder /app/target/release/order-engine .

# Expose port
EXPOSE 9090

# Start the application
CMD ["./order-engine"]
