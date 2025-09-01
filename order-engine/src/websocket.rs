use crate::engine::{OrderEngine, EngineError};
use crate::order::{Order, OrderType, OrderKind};
use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{info, warn, error};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum IncomingMessage {
    #[serde(rename = "new_order")]
    NewOrder {
        data: OrderData,
    },
    #[serde(rename = "cancel_order")]
    CancelOrder {
        data: CancelOrderData,
    },
    #[serde(rename = "get_orderbook")]
    GetOrderBook {
        data: OrderBookRequest,
    },
}

#[derive(Debug, Deserialize)]
pub struct OrderData {
    pub id: Option<String>,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub pair: String,
    #[serde(rename = "type")]
    pub order_type: String,
    #[serde(rename = "orderType")]
    pub order_kind: String,
    pub amount: f64,
    pub price: Option<f64>,
    pub timestamp: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CancelOrderData {
    #[serde(rename = "orderId")]
    pub order_id: String,
    pub pair: String,
}

#[derive(Debug, Deserialize)]
pub struct OrderBookRequest {
    pub pair: String,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum OutgoingMessage {
    #[serde(rename = "order_filled")]
    OrderFilled {
        data: OrderFilledData,
    },
    #[serde(rename = "order_partial")]
    OrderPartial {
        data: OrderPartialData,
    },
    #[serde(rename = "order_cancelled")]
    OrderCancelled {
        data: OrderCancelledData,
    },
    #[serde(rename = "orderbook_snapshot")]
    OrderBookSnapshot {
        data: OrderBookSnapshotData,
    },
    #[serde(rename = "error")]
    Error {
        message: String,
    },
}

#[derive(Debug, Serialize)]
pub struct OrderFilledData {
    #[serde(rename = "orderId")]
    pub order_id: String,
    #[serde(rename = "filledAmount")]
    pub filled_amount: f64,
    #[serde(rename = "executedPrice")]
    pub executed_price: f64,
}

#[derive(Debug, Serialize)]
pub struct OrderPartialData {
    #[serde(rename = "orderId")]
    pub order_id: String,
    #[serde(rename = "partialFill")]
    pub partial_fill: f64,
    #[serde(rename = "remainingAmount")]
    pub remaining_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct OrderCancelledData {
    #[serde(rename = "orderId")]
    pub order_id: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
pub struct OrderBookSnapshotData {
    pub pair: String,
    pub bids: Vec<(f64, f64)>,
    pub asks: Vec<(f64, f64)>,
    #[serde(rename = "bestBid")]
    pub best_bid: Option<f64>,
    #[serde(rename = "bestAsk")]
    pub best_ask: Option<f64>,
    pub spread: Option<f64>,
}

pub async fn handle_connection(stream: TcpStream, engine: Arc<OrderEngine>) -> Result<()> {
    let ws_stream = accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    info!("WebSocket connection established");

    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Err(e) = handle_message(text, &mut ws_sender, &engine).await {
                    error!("Error handling message: {}", e);
                    let error_msg = OutgoingMessage::Error {
                        message: e.to_string(),
                    };

                    if let Ok(json) = serde_json::to_string(&error_msg) {
                        let _ = ws_sender.send(Message::Text(json)).await;
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("WebSocket connection closed");
                break;
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

async fn handle_message(
    text: String,
    ws_sender: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Message,
    >,
    engine: &Arc<OrderEngine>,
) -> Result<()> {
    let incoming_msg: IncomingMessage = serde_json::from_str(&text)?;

    match incoming_msg {
        IncomingMessage::NewOrder { data } => {
            handle_new_order(data, ws_sender, engine).await?;
        }
        IncomingMessage::CancelOrder { data } => {
            handle_cancel_order(data, ws_sender, engine).await?;
        }
        IncomingMessage::GetOrderBook { data } => {
            handle_get_orderbook(data, ws_sender, engine).await?;
        }
    }

    Ok(())
}

async fn handle_new_order(
    data: OrderData,
    ws_sender: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Message,
    >,
    engine: &Arc<OrderEngine>,
) -> Result<()> {
    // Parse order data
    let order_id = data.id
        .map(|id| Uuid::from_str(&id))
        .transpose()?
        .unwrap_or_else(Uuid::new_v4);

    let user_id = Uuid::from_str(&data.user_id)?;

    let order_type = match data.order_type.as_str() {
        "buy" => OrderType::Buy,
        "sell" => OrderType::Sell,
        _ => return Err(anyhow::anyhow!("Invalid order type: {}", data.order_type)),
    };

    let order_kind = match data.order_kind.as_str() {
        "market" => OrderKind::Market,
        "limit" => OrderKind::Limit,
        _ => return Err(anyhow::anyhow!("Invalid order kind: {}", data.order_kind)),
    };

    let amount = Decimal::from_f64_retain(data.amount)
        .ok_or_else(|| anyhow::anyhow!("Invalid amount: {}", data.amount))?;

    let price = data.price
        .map(|p| Decimal::from_f64_retain(p))
        .transpose()
        .ok_or_else(|| anyhow::anyhow!("Invalid price: {:?}", data.price))?;

    // Create order
    let mut order = Order::new(
        user_id,
        data.pair,
        order_type,
        order_kind,
        amount,
        price,
    );
    order.id = order_id;

    // Process order
    match engine.add_order(order.clone()) {
        Ok(response) => {
            // Send trade notifications
            for trade in &response.trades {
                if order.is_buy() && trade.buyer_id == user_id {
                    // Buyer filled
                    let fill_data = OrderFilledData {
                        order_id: order.id.to_string(),
                        filled_amount: trade.amount.to_f64().unwrap_or(0.0),
                        executed_price: trade.price.to_f64().unwrap_or(0.0),
                    };

                    let msg = OutgoingMessage::OrderFilled { data: fill_data };
                    let json = serde_json::to_string(&msg)?;
                    ws_sender.send(Message::Text(json)).await?;
                } else if order.is_sell() && trade.seller_id == user_id {
                    // Seller filled
                    let fill_data = OrderFilledData {
                        order_id: order.id.to_string(),
                        filled_amount: trade.amount.to_f64().unwrap_or(0.0),
                        executed_price: trade.price.to_f64().unwrap_or(0.0),
                    };

                    let msg = OutgoingMessage::OrderFilled { data: fill_data };
                    let json = serde_json::to_string(&msg)?;
                    ws_sender.send(Message::Text(json)).await?;
                }
            }

            info!("Order {} processed successfully with {} trades", order.id, response.trades.len());
        }
        Err(e) => {
            error!("Failed to process order {}: {}", order.id, e);
            let error_msg = OutgoingMessage::Error {
                message: format!("Failed to process order: {}", e),
            };
            let json = serde_json::to_string(&error_msg)?;
            ws_sender.send(Message::Text(json)).await?;
        }
    }

    Ok(())
}

async fn handle_cancel_order(
    data: CancelOrderData,
    ws_sender: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Message,
    >,
    engine: &Arc<OrderEngine>,
) -> Result<()> {
    let order_id = Uuid::from_str(&data.order_id)?;

    match engine.cancel_order(&data.pair, order_id) {
        Ok(Some(_cancelled_order)) => {
            let cancel_data = OrderCancelledData {
                order_id: data.order_id,
                reason: "User requested".to_string(),
            };

            let msg = OutgoingMessage::OrderCancelled { data: cancel_data };
            let json = serde_json::to_string(&msg)?;
            ws_sender.send(Message::Text(json)).await?;

            info!("Order {} cancelled successfully", order_id);
        }
        Ok(None) => {
            let error_msg = OutgoingMessage::Error {
                message: "Order not found".to_string(),
            };
            let json = serde_json::to_string(&error_msg)?;
            ws_sender.send(Message::Text(json)).await?;
        }
        Err(e) => {
            let error_msg = OutgoingMessage::Error {
                message: format!("Failed to cancel order: {}", e),
            };
            let json = serde_json::to_string(&error_msg)?;
            ws_sender.send(Message::Text(json)).await?;
        }
    }

    Ok(())
}

async fn handle_get_orderbook(
    data: OrderBookRequest,
    ws_sender: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Message,
    >,
    engine: &Arc<OrderEngine>,
) -> Result<()> {
    if let Some(snapshot) = engine.get_orderbook_snapshot(&data.pair) {
        let orderbook_data = OrderBookSnapshotData {
            pair: snapshot.pair,
            bids: snapshot.bids.iter()
                .map(|(price, amount)| (price.to_f64().unwrap_or(0.0), amount.to_f64().unwrap_or(0.0)))
                .collect(),
            asks: snapshot.asks.iter()
                .map(|(price, amount)| (price.to_f64().unwrap_or(0.0), amount.to_f64().unwrap_or(0.0)))
                .collect(),
            best_bid: snapshot.best_bid.and_then(|p| p.to_f64()),
            best_ask: snapshot.best_ask.and_then(|p| p.to_f64()),
            spread: snapshot.spread.and_then(|s| s.to_f64()),
        };

        let msg = OutgoingMessage::OrderBookSnapshot { data: orderbook_data };
        let json = serde_json::to_string(&msg)?;
        ws_sender.send(Message::Text(json)).await?;
    } else {
        let error_msg = OutgoingMessage::Error {
            message: format!("Order book not found for pair: {}", data.pair),
        };
        let json = serde_json::to_string(&error_msg)?;
        ws_sender.send(Message::Text(json)).await?;
    }

    Ok(())
}
