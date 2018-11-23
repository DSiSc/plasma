/**
 *    SPDX-License-Identifier: Apache-2.0
 */
var express = require("express")
var Web3 = require("web3")
var rootChainAbi = require('./rootChain.json')
var childChainAbi = require('./childChain.json')
var Tx = require('./Transaction.js')
var config = require('./config.json')

class EventCenter {
  constructor () {
    this.rooturl = config['rooturl']
    this.childurl = config['childurl']
    this.rootwsurl = config['rootwsurl']
    this.childwsurl = config['childwsurl']
    this.rootAdress = config['rootAdress']
    this.childAdress = config['childAdress']
    this.privateKey = new Buffer(config['privateKey'], 'hex')
    this.rootAdmin = config['rootAdmin']
    this.childAdmin = config['childAdmin']
  }

  async initialize () {

        //初始化
        var web3EventRoot = new Web3(new Web3.providers.WebsocketProvider(this.rootwsurl));
        var rootEvents = new web3EventRoot.eth.Contract(rootChainAbi, this.rootAdress);

        var web3EventChild = new Web3(new Web3.providers.WebsocketProvider(this.childwsurl));
        var childEvents = new web3EventChild.eth.Contract(childChainAbi,this.childAdress);

        var rootWeb3 = new Web3(new Web3.providers.HttpProvider(this.rooturl));
        var rootContract = new rootWeb3.eth.Contract(rootChainAbi,this.rootAdress);
        var rootAdmin = this.rootAdmin;
        var privateKey = this.privateKey;

        var childWeb3 = new Web3(new Web3.providers.HttpProvider(this.childurl));
        var childContract = new childWeb3.eth.Contract(childChainAbi,this.childAdress);
        var childAdmin = this.childAdmin;
        

        //监听主链事件，并向子链发送存钱请求
        rootEvents.events.Deposit()
        .on("data", function(event) {
          let data = event.returnValues;
          console.log(data);
          childContract.methods.depositChildChain(data.depositor, data.amount, data.root, data.depositBlock).send({from:childAdmin, gas:3000000}).then(function(){
            console.log(childAdmin);
          });
        }).on("error", console.error);


        //监听子链事件 

        childEvents.events.CreateBlock()
        .on("data", function(event) {
          let data = event.returnValues;
          console.log(data);

          //获得签名
          var num = parseInt(data.amount);
          var amount = "0x" + num.toString(16);
          console.log("amount: " + amount);
          var rawTx = {
            utxoId: data.inputId,
            utxoValue: amount, 
            newOwner: data.newOwner,
            amount: amount
           }
          var tx = new Tx(rawTx);
          var sig = tx.sign(privateKey);
          //获取 _sigs
          var sigs = "0x" + sig.r.toString('hex') + sig.s.toString('hex') + "00" ;
          if(sig.v == 28) {
            sigs = "0x" + sig.r.toString('hex') + sig.s.toString('hex') + "01" ;
          }
          console.log("sigs: " + sigs);

          //获取 _root,  _utxoPos,_txBytes,_txHash,_signedTx,_proof,
          var sigTx = {
            utxoId: data.inputId,
            utxoValue: amount, 
            newOwner: data.newOwner,
            amount: amount,
            sigs: sigs
           }
           var sigtx = new Tx(sigTx);
           var msghash = sigtx.hash(true);
           var hash = sigtx.hash(false);
           //获取_root
           var msghashhex = "0x" + msghash.toString('hex');
           //获取_txHash
           var hashhex = "0x" + hash.toString('hex')
           console.log("msghashhex: " + msghashhex);
           console.log("hashhex: " + hashhex);
           //获取_txBytes
           var serializedTx = tx.serialize();
           var serializedTxhex = "0x" + serializedTx.toString('hex')
           console.log("serializedTxhex: " + serializedTxhex);
           //获取_signedTx
           var serializedTxsig = sigtx.serialize();
           var serializedTxsighex = "0x" + serializedTxsig.toString('hex')
           console.log("serializedTxsighex: " + serializedTxsighex);

           //调用子链添加块
          childContract.methods.addBlock(sigs, data.blockNum, data.newOwner, data.amount, msghashhex).send({from:childAdmin, gas:3000000});

          //调用主链提交块
          rootContract.methods.submitBlock(msghashhex).send({from:rootAdmin, gas:3000000}).then(function(){        
            //调用主链取款
            var utxoPos = data.blockNum * 1000000000;
            console.log("utxoPos: " + utxoPos);
            rootContract.methods.startExit(utxoPos, serializedTxhex, hashhex, serializedTxsighex, "0x", sigs).send({from:rootAdmin, gas:3000000});
          });

        }).on("error", console.error);
  }
}

module.exports = EventCenter
