const ethereumjsUtil = require('ethereumjs-util');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const secp256k1 = require('secp256k1');

function hexToBinary(hex) {
  const binary = parseInt(hex, 16).toString(2);
  return binary.padStart(256, '0');
}

class PoW {
  static hashMatchesDifficulty(hash, difficulty) {
    const hashInBinary = hexToBinary(hash);
    const requiredPrefix = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
  }

  static findBlockNonce(block, difficulty) {
    let nonce = 0;
    while (true) {
      const hash = CryptoJS.SHA256(block.calculateHash() + nonce).toString();
      if (PoW.hashMatchesDifficulty(hash, difficulty)) {
        return nonce;
      }
      nonce++;
    }
  }
}

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }
}

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
    this.difficulty = 2;
  }

  calculateHash() {
    return CryptoJS.SHA256(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
  }

  mineBlock() {
    this.nonce = PoW.findBlockNonce(this, this.difficulty);
    this.hash = this.calculateHash();
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.miningReward = 50;
    this.difficulty = 2;
  }
  addTransaction(encryptedTransaction) {
    this.pendingTransactions.push(encryptedTransaction);
  }
  getBalanceOfAddress(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans) {
          if (trans.fromAddress === address) {
            balance -= trans.amount;
          }
          if (trans.toAddress === address) {
            balance += trans.amount;
          }
        }
      }
    }
    return balance;
  }


  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }

  createGenesisBlock() {
    return new Block(Date.now(), [new Transaction(null, 'genesis-address', 0)]);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
    block.mineBlock();
    this.chain.push(block);
    this.pendingTransactions = [new Transaction(null, miningRewardAddress, this.miningReward)];
  }
}

function generateEthereumKeyPair() {
  const privateKey = crypto.randomBytes(32);
  const publicKey = secp256k1.publicKeyCreate(privateKey, false).slice(1);
  const publicKeyBuffer = Buffer.from(publicKey);
  const address = ethereumjsUtil.publicToAddress(publicKeyBuffer).toString('hex');

  return {
    publicKey: '0x' + publicKey.toString('hex'),
    privateKey: '0x' + privateKey.toString('hex'),
    address: '0x' + address
  };
}

function encryptTransaction(transaction, secretKey) {
  const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(transaction), secretKey);
  return encryptedData.toString();
}

function decryptTransaction(encryptedData, secretKey) {
  const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
  return decryptedData;
}

const user1 = generateEthereumKeyPair();
const user2 = generateEthereumKeyPair();
const miner = generateEthereumKeyPair();

console.log('User 1:', user1);
console.log('User 2:', user2);
console.log('Miner:', miner);

const gigacoin = new Blockchain();

const secretKey = "dromadaireSelimKaan5A";
const transaction = new Transaction(user1.address, user2.address, 57);
const encryptedTransaction = encryptTransaction(transaction, secretKey);
console.log('Encrypted transaction data:', encryptedTransaction);
const testEncryptedTransactionData = 'U2FsdGVkX1+DsOcssllI3Qm/2dJbfn+RUpRT2WpKuOiSBycXSTw+sNz4/Tw/PNt5P/BAjQZxQhuLUzftpvLf3OzsJAZmdy84P+TvX5ev+wnNiGILZjHjW91obvH5Tb+w6NHmv2SxXFI3n2uXQ42SH9eG339mkXQzz3sgwDxLesLl0b/jFYjCesDfebzenu+41J+WpTJOu7qcexNojiEIZg==';

let decryptedTransaction;

try {
  decryptedTransaction = decryptTransaction(encryptedTransaction, secretKey);
  console.log('Decrypted transaction data:', decryptedTransaction);
  gigacoin.addTransaction(decryptedTransaction);
} catch (error) {
  console.error('Error while decrypting the transaction:', error.message);
}


console.log("\nStarting the miner...");
gigacoin.minePendingTransactions(miner.publicKey);

console.log(`\nBalance of User 1 is ${gigacoin.getBalanceOfAddress(user1.address)}`);
console.log(`\nBalance of User 2 is ${gigacoin.getBalanceOfAddress(user2.address)}`);
console.log(`\nBalance of miner is ${gigacoin.getBalanceOfAddress(miner.address)}`);
console.log("\nIs the chain valid?", gigacoin.isChainValid());

console.log('\nStarting the miner again...');

gigacoin.minePendingTransactions(miner.publicKey);
console.log(`\nBalance of User 1 is ${gigacoin.getBalanceOfAddress(user1.address)}`);
console.log(`\nBalance of User 2 is ${gigacoin.getBalanceOfAddress(user2.address)}`);
console.log(`\nBalance of miner is ${gigacoin.getBalanceOfAddress(miner.address)}`);

console.log('\nIs the chain valid?', gigacoin.isChainValid());

console.log('\nBlockchain data:');
gigacoin.chain.forEach((block, index) => {
  console.log(`Block ${index}:`);
  console.log(`  Timestamp: ${block.timestamp}`);
  console.log(`  Previous hash: ${block.previousHash}`);
  console.log(`  Hash: ${block.hash}`);
  console.log('  Transactions:');
  block.transactions.forEach(tx => {
    console.log(`    ${tx.fromAddress} -> ${tx.toAddress}: ${tx.amount}`);
  });
});

module.exports = { Blockchain, Transaction, encryptTransaction, decryptTransaction };