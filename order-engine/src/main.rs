use anyhow::Result;
use clap::Parser;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tracing::{info, warn, error};
use tracing_subscriber;

mod engine;
mod order;
mod orderbook;
mod websocket;

use engine::OrderEngine;
use websocket::handle_connection;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Port to bind the WebSocket server to
    #[arg(short, long, default_value_t = 9090)]
    port: u16,

    /// Number of worker threads
    #[arg(short, long, default_value_t = 4)]
    workers: usize,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    info!("Starting Rust Order Matching Engine");
    info!("Port: {}, Workers: {}", args.port, args.workers);

    // Create the order engine
    let engine = Arc::new(OrderEngine::new(args.workers));

    // Start the WebSocket server
    let addr = format!("127.0.0.1:{}", args.port);
    let listener = TcpListener::bind(&addr).await?;
    info!("Order matching engine listening on: {}", addr);

    // Accept connections
    while let Ok((stream, addr)) = listener.accept().await {
        info!("New connection from: {}", addr);
        let engine_clone = Arc::clone(&engine);

        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, engine_clone).await {
                error!("Connection error: {}", e);
            }
        });
    }

    Ok(())
}
