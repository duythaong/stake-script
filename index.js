import Cache from './classes/cache.js';
import Message from './classes/msg.js';
import Network from './classes/network.js';

const msg = new Message();
const cache = new Cache();
const network = new Network();

// main
(async () => {
  // get starting tick
  let startingTick = Math.floor(new Date().getTime() / 1000);

  msg.primary('[debug::main] Owner Staking has been started.');

	// balance check
  if(network.bnb_balance == 0) {
    msg.error(`[error::init] You don't have any BNB in your account. (used for gas fee)`);
      process.exit();
  }

  await cache.load('accounts.json');
	await network.load(cache);
  // await network.prepare()

  // staging 
  await network.runOwnerStake('stake-staging.json');

  // mainnet
  // await network.runOwnerStake('stake-0727.json');
  // await network.compensateRewards('0x0000000000000000000000000000000000000000');
  // await network.compensateRewards('0x55d398326f99059ff775485246999027b3197955');
  // await network.compensateRewards('0x2170ed0880ac9a755fd29b2688956bd959f933f8');
  // await network.compensateRewards('0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c');
  
  // save cache just to be sure
  await cache.save();

  msg.success(`Finished in ${((Math.floor(new Date().getTime() / 1000)) - startingTick)} seconds.`);

  process.exit();

})()