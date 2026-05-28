import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let price = 100;
let bullPower = 50;
let bearPower = 50;
let priceHistory: number[] = [100];
const RSI_PERIOD = 14;

function calculateRSI(prices: number[]) {
  if (prices.length < RSI_PERIOD + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - RSI_PERIOD; i < prices.length; i++) {
    const currentPrice = prices[i];
    const prevPrice = prices[i - 1];
    
    if (currentPrice === undefined || prevPrice === undefined) continue;
    
    const diff = currentPrice - prevPrice;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  
  const avgGain = gains / RSI_PERIOD;
  const avgLoss = losses / RSI_PERIOD;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number) {
  if (prices.length === 0) return 100;
  const k = 2 / (period + 1);
  let ema = prices[0]!;
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i]! * k + ema * (1 - k);
  }
  return ema;
}

function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return ema12 - ema26;
}

// Market Simulation Engine
setInterval(() => {
  const volatility = 0.2;
  const trend = (bullPower - bearPower) / 500;
  const change = (Math.random() - 0.5) * volatility + trend;
  price += change;
  
  priceHistory.push(price);
  if (priceHistory.length > 200) priceHistory.shift();

  const rsi = calculateRSI(priceHistory);
  const macd = calculateMACD(priceHistory);
  const high = Math.max(...priceHistory);
  const low = Math.min(...priceHistory);

  // AI Enemy Commander Logic
  if (Math.abs(bullPower - bearPower) > 100 && Math.random() < 0.05) {
    if (bullPower > bearPower) {
      bearPower += 150;
      io.emit('commander_attack', { side: 'BEAR', msg: 'BEAR_GENERAL_INITIATES_COUNTER_ATTACK' });
    } else {
      bullPower += 150;
      io.emit('commander_attack', { side: 'BULL', msg: 'BULL_WARLORD_REINFORCEMENTS_ARRIVE' });
    }
  }

  // Decay power over time back to 50
  bullPower = 50 + (bullPower - 50) * 0.95;
  bearPower = 50 + (bearPower - 50) * 0.95;

  io.emit('market_update', {
    price,
    bullPower,
    bearPower,
    rsi,
    macd,
    high,
    low,
    timestamp: Date.now()
  });
}, 500);

io.on('connection', (socket) => {
  console.log('Commander connected:', socket.id);

  socket.on('deploy_bulls', () => {
    bullPower = Math.min(bullPower + 15, 200);
    console.log('Bulls deployed! Current Bull Power:', bullPower);
  });

  socket.on('deploy_bears', () => {
    bearPower = Math.min(bearPower + 15, 200);
    console.log('Bears deployed! Current Bear Power:', bearPower);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`War Room active on port ${PORT}`);
});
