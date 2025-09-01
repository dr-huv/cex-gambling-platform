use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OrderType {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OrderKind {
    Market,
    Limit,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Pending,
    Partial,
    Filled,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub pair: String,
    pub order_type: OrderType,
    pub order_kind: OrderKind,
    pub amount: Decimal,
    pub price: Option<Decimal>,
    pub filled: Decimal,
    pub status: OrderStatus,
    pub created_at: DateTime<Utc>,
}

impl Order {
    pub fn new(
        user_id: Uuid,
        pair: String,
        order_type: OrderType,
        order_kind: OrderKind,
        amount: Decimal,
        price: Option<Decimal>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            user_id,
            pair,
            order_type,
            order_kind,
            amount,
            price,
            filled: Decimal::ZERO,
            status: OrderStatus::Pending,
            created_at: Utc::now(),
        }
    }

    pub fn remaining_amount(&self) -> Decimal {
        self.amount - self.filled
    }

    pub fn fill(&mut self, amount: Decimal) {
        self.filled += amount;
        if self.filled >= self.amount {
            self.status = OrderStatus::Filled;
        } else {
            self.status = OrderStatus::Partial;
        }
    }

    pub fn cancel(&mut self) {
        self.status = OrderStatus::Cancelled;
    }

    pub fn is_buy(&self) -> bool {
        matches!(self.order_type, OrderType::Buy)
    }

    pub fn is_sell(&self) -> bool {
        matches!(self.order_type, OrderType::Sell)
    }

    pub fn is_market(&self) -> bool {
        matches!(self.order_kind, OrderKind::Market)
    }

    pub fn is_limit(&self) -> bool {
        matches!(self.order_kind, OrderKind::Limit)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub id: Uuid,
    pub buy_order_id: Uuid,
    pub sell_order_id: Uuid,
    pub buyer_id: Uuid,
    pub seller_id: Uuid,
    pub pair: String,
    pub amount: Decimal,
    pub price: Decimal,
    pub timestamp: DateTime<Utc>,
}

impl Trade {
    pub fn new(
        buy_order: &Order,
        sell_order: &Order,
        amount: Decimal,
        price: Decimal,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            buy_order_id: buy_order.id,
            sell_order_id: sell_order.id,
            buyer_id: buy_order.user_id,
            seller_id: sell_order.user_id,
            pair: buy_order.pair.clone(),
            amount,
            price,
            timestamp: Utc::now(),
        }
    }
}
