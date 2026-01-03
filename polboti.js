require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Web3 = require('web3');

// --- CONFIG ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const POLYGON_RPC = 'polygon-rpc.com';
const NFTFAN_TOKEN_ADDRESS = '0x2017Fcaea540d2925430586DC92818035Bfc2F50';

// --- SETUP WEB3 ---
const web3 = new Web3(POLYGON_RPC);

const nftfanAbi = [
  {
    "inputs": [{"internalType":"address","name":"account","type":"address"}],
    "name":"balanceOf",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType":"uint8","name":"","type":"uint8"}],
    "stateMutability":"view",
    "type":"function"
  }
];

const nftfanContract = new web3.eth.Contract(nftfanAbi, NFTFAN_TOKEN_ADDRESS);

// --- INIT BOT ---
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// --- FUNCTIONS ---
async function getBalances(walletAddress) {
  try {
    const polWei = await web3.eth.getBalance(walletAddress);
    const pol = Number(web3.utils.fromWei(polWei, 'ether')).toFixed(4);

    const decimals = await nftfanContract.methods.decimals().call();
    const raw = await nftfanContract.methods.balanceOf(walletAddress).call();

    const divisor = 10n ** BigInt(decimals);
    const nftfan = (BigInt(raw) / divisor).toLocaleString('en-US');

    return { pol, nftfan };
  } catch (e) {
    console.error('Balance fetch error:', e);
    return null;
  }
}

function extractWallets(text) {
  return text.match(/\b0x[a-fA-F0-9]{40}\b/g) || [];
}

// --- BOT LISTENER ---
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== CHAT_ID) return;
  if (!msg.text) return;

  const wallets = extractWallets(msg.text);
  if (!wallets.length) return;

  for (const wallet of wallets) {
    await bot.sendMessage(CHAT_ID, `🔍 Fetching balances for:\n${wallet}`);
    const balances = await getBalances(wallet);

    if (balances) {
      await bot.sendMessage(
        CHAT_ID,
        `💼 Wallet: ${wallet}\n` +
        `🟣 POL: ${balances.pol}\n` +
        `🟡 NFTFan: ${balances.nftfan}`
      );
    } else {
      await bot.sendMessage(CHAT_ID, `❌ Failed for: ${wallet}`);
    }
  }
});
