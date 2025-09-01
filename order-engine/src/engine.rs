use crate::orderbook::OrderBook;
use crate::order::{Order, Trade};
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{info, warn, error};
use uuid::Uuid;

pub type EngineResult<T> = Result<T, EngineError>;

#[derive(Debug)]
pub enum EngineError {
    OrderBookNotFound(String),
    InvalidOrder(String),
    ProcessingError(String),
}

impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EngineError::OrderBookNotFound(pair) => write!(f, "Order book not found for pair: {}", pair),
            EngineError::InvalidOrder(msg) => write!(f, "Invalid order: {}", msg),
            EngineError::ProcessingError(msg) => write!(f, "Processing error: {}", msg),
        }
    }
}

impl std::error::Error for EngineError {}

#[derive(Debug, Clone)]
pub enum EngineMessage {
    NewOrder(Order),
    CancelOrder(Uuid),
    GetOrderBook(String),
}

#[derive(Debug, Clone)]
pub struct EngineResponse {
    pub trades: Vec<Trade>,
    pub updated_order: Option<Order>,
}

pub struct OrderEngine {
    orderbooks: Arc<DashMap<String, OrderBook>>,
    tx: mpsc::UnboundedSender<EngineMessage>,
}

impl OrderEngine {
    pub fn new(workers: usize) -> Self {
        let orderbooks = Arc::new(DashMap::new());
        let (tx, rx) = mpsc::unbounded_channel();

        // Start worker tasks
        for i in 0..workers {
            let orderbooks_clone = Arc::clone(&orderbooks);
            let mut rx_clone = rx.clone();

            tokio::spawn(async move {
                info!("Starting worker thread {}", i);
                // Worker implementation would go here
                // For now, we'll handle messages directly
            });
        }

        // Initialize common trading pairs
        let pairs = vec![
            "BTC/USDT".to_string(),
            "ETH/USDT".to_string(),
            "SOL/USDT".to_string(),
            "ADA/USDT".to_string(),
        ];

        for pair in pairs {
            orderbooks.insert(pair.clone(), OrderBook::new(pair));
        }

        info!("Order engine initialized with {} workers", workers);

        Self {
            orderbooks,
            tx,
        }
    }

    pub fn add_order(&self, order: Order) -> EngineResult<EngineResponse> {
        let pair = order.pair.clone();

        if let Some(mut orderbook_ref) = self.orderbooks.get_mut(&pair) {
            let trades = orderbook_ref.add_order(order.clone());

            info!(
                "Order {} processed for pair {}, generated {} trades",
                order.id,
                pair,
                trades.len()
            );

            Ok(EngineResponse {
                trades,
                updated_order: Some(order),
            })
        } else {
            // Create new orderbook for the pair
            let mut new_orderbook = OrderBook::new(pair.clone());
            let trades = new_orderbook.add_order(order.clone());
            self.orderbooks.insert(pair.clone(), new_orderbook);

            info!("Created new orderbook for pair {} and processed order {}", pair, order.id);

            Ok(EngineResponse {
                trades,
                updated_order: Some(order),
            })
        }
    }

    pub fn cancel_order(&self, pair: &str, order_id: Uuid) -> EngineResult<Option<Order>> {
        if let Some(mut orderbook_ref) = self.orderbooks.get_mut(pair) {
            let cancelled_order = orderbook_ref.cancel_order(order_id);

            if cancelled_order.is_some() {
                info!("Order {} cancelled in pair {}", order_id, pair);
            } else {
                warn!("Order {} not found for cancellation in pair {}", order_id, pair);
            }

            Ok(cancelled_order)
        } else {
            Err(EngineError::OrderBookNotFound(pair.to_string()))
        }
    }

    pub fn get_orderbook(&self, pair: &str) -> Option<OrderBook> {
        self.orderbooks.get(pair).map(|book_ref| book_ref.clone())
    }

    pub fn get_orderbook_snapshot(&self, pair: &str) -> Option<OrderBookSnapshot> {
        if let Some(orderbook_ref) = self.orderbooks.get(pair) {
            let orderbook = orderbook_ref.value();

            let bids: Vec<(rust_decimal::Decimal, rust_decimal::Decimal)> = orderbook
                .bids
                .iter()
                .map(|(price, orders)| {
                    let total_amount: rust_decimal::Decimal = orders
                        .iter()
                        .map(|o| o.remaining_amount())
                        .sum();
                    (*price, total_amount)
                })
                .collect();

            let asks: Vec<(rust_decimal::Decimal, rust_decimal::Decimal)> = orderbook
                .asks
                .iter()
                .map(|(price, orders)| {
                    let total_amount: rust_decimal::Decimal = orders
                        .iter()
                        .map(|o| o.remaining_amount())
                        .sum();
                    (*price, total_amount)
                })
                .collect();

            Some(OrderBookSnapshot {
                pair: pair.to_string(),
                bids,
                asks,
                best_bid: orderbook.get_best_bid(),
                best_ask: orderbook.get_best_ask(),
                spread: orderbook.get_spread(),
            })
        } else {
            None
        }
    }

    pub fn get_pairs(&self) -> Vec<String> {
        self.orderbooks.iter().map(|entry| entry.key().clone()).collect()
    }
}

#[derive(Debug, Clone)]
pub struct OrderBookSnapshot {
    pub pair: String,
    pub bids: Vec<(rust_decimal::Decimal, rust_decimal::Decimal)>,
    pub asks: Vec<(rust_decimal::Decimal, rust_decimal::Decimal)>,
    pub best_bid: Option<rust_decimal::Decimal>,
    pub best_ask: Option<rust_decimal::Decimal>,
    pub spread: Option<rust_decimal::Decimal>,
}
