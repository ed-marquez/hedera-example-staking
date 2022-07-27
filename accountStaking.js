console.clear();
require("dotenv").config();
const {
	Client,
	AccountId,
	PrivateKey,
	AccountCreateTransaction,
	AccountUpdateTransaction,
	Hbar,
	AccountInfoQuery,
} = require("@hashgraph/sdk");
const fs = require("fs");

const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
	// Create a new Hedera account
	const aliceKey = PrivateKey.generateED25519();
	const aliceBalance = 100;
	const [accStatus, aliceId] = await accountCreatorFcn(aliceKey, aliceBalance, operatorId, true);
	console.log(
		`\n- 1.1) ${accStatus}: Created account ${aliceId} for Alice with initial balance of ${aliceBalance} hbar`
	);
	await getStakingInfoFcn(aliceId);

	// Update an existing account
	const updateStatus = await accountUpdaterFcn(aliceId, aliceKey, 3, false);
	console.log(`\n- 1.2) ${updateStatus}: Updated account ${aliceId}:`);
	await getStakingInfoFcn(aliceId);

	console.log(`\n- THE END ============================================`);
}
// ============================================
// FUNCTIONS
async function accountCreatorFcn(pvKey, iBal, stakeAccount, noRewardFlag) {
	const accountCreateTx = await new AccountCreateTransaction()
		.setKey(pvKey.publicKey)
		.setInitialBalance(new Hbar(iBal))
		.setStakedAccountId(stakeAccount) // SET THIS ONE...
		// .setStakedNodeId(stakeNode) // OR THIS ONE - DON'T SET BOTH
		.setDeclineStakingReward(noRewardFlag)
		// .setReceiverSignatureRequired(booleanValue)
		// .setMaxAutomaticTokenAssociations(amount)
		// .setAccountMemo(memo)
		// .setAutoRenewPeriod(autoRenewPeriod)
		.execute(client);
	const accountCreateRx = await accountCreateTx.getReceipt(client);
	return [accountCreateRx.status, accountCreateRx.accountId];
}

async function accountUpdaterFcn(accountId, pvKey, stakeNode, noRewardFlag) {
	const accountUpdateTx = new AccountUpdateTransaction()
		.setAccountId(accountId)
		// .setStakedAccountId(stakeAccount) // SET THIS ONE...
		.setStakedNodeId(stakeNode) // OR THIS ONE - DON'T SET BOTH
		.setDeclineStakingReward(noRewardFlag)
		// .setKey(key)
		// .setReceiverSignatureRequired(booleanValue)
		// .setMaxAutomaticTokenAssociations(amount)
		// .setAccountMemo(memo)
		// .setAutoRenewPeriod(autoRenewPeriod)
		// .setExpirationTime(expirationTime)
		.freezeWith(client);
	const accountUpdateSign = await accountUpdateTx.sign(pvKey);
	const accountUpdateSubmit = await accountUpdateSign.execute(client);
	const accountUpdateRx = await accountUpdateSubmit.getReceipt(client);
	return accountUpdateRx.status;
}

async function getStakingInfoFcn(id) {
	const accountInfo = await new AccountInfoQuery().setAccountId(id).execute(client);
	console.log(`- Staking info:`);
	console.log(`-- stakedAccountId: ${accountInfo.stakingInfo.stakedAccountId}`);
	console.log(`-- stakedNodeId: ${accountInfo.stakingInfo.stakedNodeId}`);
	console.log(`-- declineStakingReward: ${accountInfo.stakingInfo.declineStakingReward}`);
}
main();
