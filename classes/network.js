import ethers from "ethers";
import dotenv from "dotenv";
import Message from "./msg.js";

dotenv.config();
const msg = new Message();

const data = {
  STAKING: process.env.STAKING,
  CIG: process.env.CIG,
  BTCB: process.env.BTCB,
  BUSD: process.env.BUSD,
  ETH: process.env.ETH,
  USDT: process.env.USDT,
  XRP: process.env.XRP,
  gasLimit: process.env.GAS_LIMIT, //at least 21000
  price: ethers.utils.parseUnits(`${process.env.GWEI}`, "gwei"), //in gwei
};

export default class Network {
  async load(cache) {
    msg.primary(`[debug::network] Load network..`);
    try {
      this.cache = cache;
      this.node = new ethers.providers.JsonRpcProvider(process.env.BSC_RPC);
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
      this.account = this.wallet.connect(this.node);
      this.network = await this.node.getNetwork();
      this.staking = new ethers.Contract(
        data.STAKING,
        [
          "function stake(uint256 _id, uint256 _amount) external",
          "function unstake(uint256 _bagLengthIndex) external",
          "function unstakes(uint256[] memory indexs) public",
          "function ownerStake(address[] calldata _accounts, uint256[] calldata _ids, uint256[] calldata _amounts) external",
          "function compensateRewards(address _bep20pf, uint256[] memory _amounts, address[] memory _users, uint256[] memory _bagIndexs) public",
          "function depositProfit(uint256[] memory _amounts, address[] memory _users, uint256[] memory _bagIndexs) public payable",
          "function getStake(address _guy) public view returns(uint256[] memory bagLength)",
          "function getStake(address _guy, uint256 _index) public view returns(uint256 start, uint256 amount)",
          "function getStakeReward(address _guy, uint256 _index, address _asset) public view returns(uint256 reward)",
        ],
        this.account
      );
		this.cig = new ethers.Contract(
			data.CIG,
			[
			"function approve(address spender, uint256 amount) external returns (bool)",
			],
			this.account
		);

		this.btcb = new ethers.Contract(
			data.BTCB,
			[
			"function approve(address spender, uint256 amount) external returns (bool)",
			],
			this.account
		);

		this.busd = new ethers.Contract(
			data.BUSD,
			[
			"function approve(address spender, uint256 amount) external returns (bool)",
			],
			this.account
		);

		this.eth = new ethers.Contract(
			data.ETH,
			[
			"function approve(address spender, uint256 amount) external returns (bool)",
			],
			this.account
		);

		this.usdt = new ethers.Contract(
			data.USDT,
			[
			"function approve(address spender, uint256 amount) external returns (bool)",
			],
			this.account
		);

		this.xrp = new ethers.Contract(
			data.XRP,
			[
			"function approve(address spender, uint256 amount) external returns (bool)",
			],
			this.account
		);

		this.bnb_balance = parseInt(await this.account.getBalance());
		this.base_nonce = parseInt(await this.node.getTransactionCount(this.account.address));
		this.nonce_offset = 0;
		this.first_block = -1;
    msg.primary('Completed!')
    } catch (e) {
      msg.error(`[error::network] ${e}`);
      process.exit();
    }
  }

  async prepare() {
    msg.primary(`[debug::network] Preparing network..`);
    const maxInt =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    if (!this.cache.isAddressCached(data.CIG)) {
      this.cache.createAddress(data.CIG);
      this.cache.setAddressArtifacts(
        data.CIG,
        18,
        "CIG"
        // await this.cig.decimals(),
        // await this.cig.symbol()
      );
      msg.primary(
        `[debug::network] Approving balance for ${
          this.cache.data.addresses[data.CIG].symbol
        }.`
      );
      const approveTx = await this.cig.approve(this.staking.address, maxInt, {
        gasLimit: data.gasLimit,
        gasPrice: data.price,
        nonce: this.getNonce(),
      });
      let approveReceipt = await approveTx.wait();
      if (!approveReceipt.logs[0].transactionHash) {
        msg.error(
          `[error::network] Could not approve ${
            this.cache.data.addresses[data.CIG].symbol
          }. (cache)`
        );
        process.exit();
      }
      msg.success(
        `[debug::network] ${
          this.cache.data.addresses[data.CIG].symbol
        } has been approved. (cache)`
      );
      await this.cache.save();
    } else {
      msg.success(
        `[debug::network] ${
          this.cache.data.addresses[data.CIG].symbol
        } has already been approved. (cache)`
      );
    }
  }

  async testOwnerStake() {
    try {
      msg.primary(`[debug::network] Preparing test..`);
      const accounts = this.cache.data;
      const length = 10;
      const addresses = [];
      const ids = [];
      const amounts = [];
      const time = Math.round(Date.now()/1000);
  
      for(let i = 0; i < length; i++) {
        addresses.push(accounts[i].address);
        ids.push(time+ i);
        amounts.push(ethers.utils.parseUnits(`${Math.random().toFixed(2)}`, 'ether'))
      }  
      
      // return this.ownerStake(addresses, ids, amounts);
      const tx = await this.staking.ownerStake(addresses, ids, amounts, {
        gasLimit: data.gasLimit,
        gasPrice: data.price,
        nonce: this.getNonce(),
      });

      msg.success(
        `[debug::transact] TX has been submitted. Waiting for response..\n`
      );
      let receipt = await tx.wait();
      msg.success(
        `[Owner:stake]: https://testnet.bscscan.com/tx/${receipt.transactionHash}`
      );

    } catch (error) {
      console.log(`[error::ownerStake] ${error}`);
      process.exit();
    }
  }

  async stake(_id, _amount) {
    try {
      return this.staking.stake(_id, _amount, {
        gasLimit: data.gasLimit,
        gasPrice: data.price,
        nonce: this.getNonce(),
      });
    } catch (e) {
      console.log(`[error::stake] ${e.error}`);
      process.exit();
    }
  }

  async unstakes(indexes) {
    try {
      let gas =
        await this.staking.estimateGas.unstakes(
          indexes,
          {
            gasLimit: data.gasLimit,
            gasPrice: data.price,
            nonce: this.getNonce(),
          }
        );

      if (gas > parseInt(data.gas_limit) || gas > parseInt(data.gas_limit)) {
        msg.error(
          `[error::simulate] The transaction requires at least ${gas} gas, your limit is ${data.gas_limit}.`
        );
        process.exit();
      }
      return true;
    } catch (e) {
      console.log(`[error::estimategas] ${e.error}`);
      return this.estimateTransaction(amountIn, amountOutMin, contracts);
    }
  }

  async ownerStake(accounts, ids, amounts) {
    try {
      let gas = await this.estimateGas.ownerStake(accounts, ids, amounts);

      // check if is using enough gas.
      if (gas > parseInt(data.gasLimit) || gas > parseInt(data.gasLimit)) {
        msg.error(
          `[error::simulate] The transaction requires at least ${gas} gas, your limit is ${data.gasLimit}.`
        );
        process.exit();
      }

      const tx = await stakingContract.ownerStake(accounts, ids, amounts, {
        gasLimit: data.gasLimit,
        gasPrice: data.price,
        nonce: this.getNonce(),
      });

      msg.success(
        `[debug::transact] TX has been submitted. Waiting for response..\n`
      );
      let receipt = await tx.wait();
      msg.success(
        `[Owner:stake]: https://testnet.bscscan.com/tx/${receipt.transactionHash}`
      );
    } catch (err) {
      if (err.error && err.error.message) {
        msg.error(`[error::transact] ${err.error.message}`);
      } else {
        console.log(err);
      }
    }
  }

  async getStake(_guy) {
    const ids = await this.staking.getStake(_guy);
    if (ids.length === 0) {
      msg.warning(`[debug::getStake] ${_guy} is no staking yet.`);
    }
    return ids;
  }

  async getStakeDetail(_guy, _index) {
    const [start, amount] = await this.staking.getStake(_guy, _index);
    return [start, amount];
  }

  async getStakeReward(_guy, _index, _asset) {
    const rewards = await this.staking.getStakeReward(_guy, _index, _asset);
    if (!rewards) {
      msg.warning(`[debug::getRewards] ${_guy} has not rewards yet`);
    }
    return rewards;
  }

  getNonce() {
    let nonce = this.base_nonce + this.nonce_offset;
    this.nonce_offset++;
    return nonce;
  }
}

