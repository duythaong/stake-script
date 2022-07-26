import Cache from './classes/cache.js';
import Message from './classes/msg.js';
import Network from './classes/network.js';

const msg = new Message();
const cache = new Cache();
const network = new Network();

// main
(async () => {
	await cache.load('accounts.json');
	await network.load(cache);
  // await network.prepare()
  await network.testOwnerStake();
    
  // print debug info
  // console.clear();

  // get starting tick
  let startingTick = Math.floor(new Date().getTime() / 1000);

  msg.primary('[debug::main] Owner Staking has been started.');

	// balance check
  if(network.bnb_balance == 0) {
    msg.error(`[error::init] You don't have any BNB in your account. (used for gas fee)`);
      process.exit();
  }

  // save cache just to be sure
  await cache.save();

  msg.success(`Finished in ${((Math.floor(new Date().getTime() / 1000)) - startingTick)} seconds.`);

  process.exit();

})()