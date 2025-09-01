use crate::order::{Order, OrderType, Trade};
use rust_decimal::Decimal;
use std::collections::{BTreeMap, VecDeque};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct OrderBook {
    pub pair: String,
    pub bids: BTreeMap<Decimal, VecDeque<Order>>, // Buy orders (price -> orders)
    pub asks: BTreeMap<Decimal, VecDeque<Order>>, // Sell orders (price -> orders)
}

impl OrderBook {
    pub fn new(pair: String) -> Self {
        Self {
            pair,
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
        }
    }

    pub fn add_order(&mut self, mut order: Order) -> Vec<Trade> {
        let mut trades = Vec::new();

        match order.order_type {
            OrderType::Buy => {
                // Match against asks (sell orders)
                trades = self.match_buy_order(&mut order);

                // Add remaining order to book if not fully filled
                if order.remaining_amount() > Decimal::ZERO {
                    if let Some(price) = order.price {
                        self.bids.entry(price).or_insert_with(VecDeque::new).push_back(order);
                    }
                }
            }
            OrderType::Sell => {
                // Match against bids (buy orders)
                trades = self.match_sell_order(&mut order);

                // Add remaining order to book if not fully filled
                if order.remaining_amount() > Decimal::ZERO {
                    if let Some(price) = order.price {
                        self.asks.entry(price).or_insert_with(VecDeque::new).push_back(order);
                    }
                }
            }
        }

        trades
    }

    fn match_buy_order(&mut self, buy_order: &mut Order) -> Vec<Trade> {
        let mut trades = Vec::new();
        let mut prices_to_remove = Vec::new();

        // Get all ask prices in ascending order
        let ask_prices: Vec<&Decimal> = self.asks.keys().collect();

        for &ask_price in ask_prices {
            if buy_order.remaining_amount() <= Decimal::ZERO {
                break;
            }

            // Check if buy order price is high enough for this ask
            if let Some(buy_price) = buy_order.price {
                if buy_price < *ask_price {
                    break; // No more matches possible
                }
            }

            if let Some(ask_orders) = self.asks.get_mut(ask_price) {
                while let Some(mut sell_order) = ask_orders.pop_front() {
                    if buy_order.remaining_amount() <= Decimal::ZERO {
                        ask_orders.push_front(sell_order);
                        break;
                    }

                    let trade_amount = buy_order.remaining_amount().min(sell_order.remaining_amount());
                    let trade_price = *ask_price;

                    // Create trade
                    let trade = Trade::new(buy_order, &sell_order, trade_amount, trade_price);
                    trades.push(trade);

                    // Update orders
                    buy_order.fill(trade_amount);
                    sell_order.fill(trade_amount);

                    // Put sell order back if not fully filled
                    if sell_order.remaining_amount() > Decimal::ZERO {
                        ask_orders.push_front(sell_order);
                        break;
                    }
                }

                if ask_orders.is_empty() {
                    prices_to_remove.push(*ask_price);
                }
            }
        }

        // Remove empty price levels
        for price in prices_to_remove {
            self.asks.remove(&price);
        }

        trades
    }

    fn match_sell_order(&mut self, sell_order: &mut Order) -> Vec<Trade> {
        let mut trades = Vec::new();
        let mut prices_to_remove = Vec::new();

        // Get all bid prices in descending order
        let bid_prices: Vec<&Decimal> = self.bids.keys().rev().collect();

        for &bid_price in bid_prices {
            if sell_order.remaining_amount() <= Decimal::ZERO {
                break;
            }

            // Check if sell order price is low enough for this bid
            if let Some(sell_price) = sell_order.price {
                if sell_price > *bid_price {
                    break; // No more matches possible
                }
            }

            if let Some(bid_orders) = self.bids.get_mut(bid_price) {
                while let Some(mut buy_order) = bid_orders.pop_front() {
                    if sell_order.remaining_amount() <= Decimal::ZERO {
                        bid_orders.push_front(buy_order);
                        break;
                    }

                    let trade_amount = sell_order.remaining_amount().min(buy_order.remaining_amount());
                    let trade_price = *bid_price;

                    // Create trade
                    let trade = Trade::new(&buy_order, sell_order, trade_amount, trade_price);
                    trades.push(trade);

                    // Update orders
                    sell_order.fill(trade_amount);
                    buy_order.fill(trade_amount);

                    // Put buy order back if not fully filled
                    if buy_order.remaining_amount() > Decimal::ZERO {
                        bid_orders.push_front(buy_order);
                        break;
                    }
                }

                if bid_orders.is_empty() {
                    prices_to_remove.push(*bid_price);
                }
            }
        }

        // Remove empty price levels
        for price in prices_to_remove {
            self.bids.remove(&price);
        }

        trades
    }

    pub fn cancel_order(&mut self, order_id: Uuid) -> Option<Order> {
        // Search in bids
        for (_, orders) in self.bids.iter_mut() {
            if let Some(pos) = orders.iter().position(|o| o.id == order_id) {
                let mut order = orders.remove(pos).unwrap();
                order.cancel();
                return Some(order);
            }
        }

        // Search in asks
        for (_, orders) in self.asks.iter_mut() {
            if let Some(pos) = orders.iter().position(|o| o.id == order_id) {
                let mut order = orders.remove(pos).unwrap();
                order.cancel();
                return Some(order);
            }
        }

        None
    }

    pub fn get_best_bid(&self) -> Option<Decimal> {
        self.bids.keys().next_back().copied()
    }

    pub fn get_best_ask(&self) -> Option<Decimal> {
        self.asks.keys().next().copied()
    }

    pub fn get_spread(&self) -> Option<Decimal> {
        match (self.get_best_bid(), self.get_best_ask()) {
            (Some(bid), Some(ask)) => Some(ask - bid),
            _ => None,
        }
    }
}
