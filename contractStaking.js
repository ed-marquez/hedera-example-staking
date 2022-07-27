console.clear();
require("dotenv").config();
const {
	AccountId,
	PrivateKey,
	Client,
	ContractCreateFlow,
	ContractUpdateTransaction,
	ContractInfoQuery,
} = require("@hashgraph/sdk");
const fs = require("fs");

// Configure accounts and client
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
	// Import the compiled contract bytecode
	const contractBytecode = fs.readFileSync("simpleContract.bin");

	// Deploy a contract on Hedera
	const [contractId, contractAddress] = await contractCreatorFcn(
		contractBytecode,
		operatorKey,
		operatorId,
		false
	);
	console.log(`\n- 2.1) The smart contract ID is: ${contractId}`);
	console.log(`- The smart contract ID in Solidity format is: ${contractAddress}`);
	await getStakingInfoFcn(contractId);

	// Update an existing smart contract (must have admin key)
	const updateStatus = await contractUpdaterFcn(contractId, operatorKey, null, 4, true);
	console.log(`\n- 2.2) ${updateStatus}: Updated contract ${contractId}:`);
	await getStakingInfoFcn(contractId);

	console.log(`\n- THE END ============================================`);
}
// ============================================
//  FUNCTIONS
async function contractCreatorFcn(contractBytecode, adminKey, stakeAccount, noRewardFlag) {
	const contractDeployTx = await new ContractCreateFlow()
		.setBytecode(contractBytecode)
		.setGas(100000)
		.setAdminKey(adminKey)
		.setStakedAccountId(stakeAccount) // SET THIS ONE...
		// .setStakedNodeId(stakeNode) // OR THIS ONE - DON'T SET BOTH
		// .setDeclineStakingReward(noRewardFlag) // MISSING IN SDK V2.17 FOR ContractCreateFlow()
		// .setInitialBalance(initialBalance)
		// .setConstructorParameters(constructorParameters)
		// .setContractMemo(memo)
		// .setAutoRenewAccountId(autoRenewAccountId)
		// .setAutoRenewPeriod(autoRenewPeriod)
		// .setMaxAutomaticTokenAssociations(amount)
		.execute(client);
	const contractDeployRx = await contractDeployTx.getReceipt(client);
	const contractId = contractDeployRx.contractId;
	const contractAddress = contractId.toSolidityAddress();
	return [contractId, contractAddress];
}

async function contractUpdaterFcn(id, adminKey, stakeAccount, stakeNode, noRewardFlag) {
	const contractUpdateTx = new ContractUpdateTransaction()
		.setContractId(id)
		// .setStakedAccountId(stakeAccount) // SET THIS ONE...
		.setStakedNodeId(stakeNode) // OR THIS ONE - DON'T SET BOTH
		.setDeclineStakingReward(noRewardFlag)
		// .setAdminKey(adminKey)
		// .setContractMemo(memo)
		// .setAutoRenewAccountId(autoRenewAccountId)
		// .setAutoRenewPeriod(autoRenewPeriod)
		// .setContractExpirationTime(expirationTime)
		// .setMaxAutomaticTokenAssociations(amount)
		.freezeWith(client);
	const contractUpdateSign = await contractUpdateTx.sign(adminKey);
	const contractUpdateSubmit = await contractUpdateSign.execute(client);
	const contractUpdateRx = await contractUpdateSubmit.getReceipt(client);
	return contractUpdateRx.status;
}

async function getStakingInfoFcn(id) {
	const accountInfo = await new ContractInfoQuery().setContractId(id).execute(client);
	console.log(`- Staking info:`);
	console.log(`-- stakedAccountId: ${accountInfo.stakingInfo.stakedAccountId}`);
	console.log(`-- stakedNodeId: ${accountInfo.stakingInfo.stakedNodeId}`);
	console.log(`-- declineStakingReward: ${accountInfo.stakingInfo.declineStakingReward}`);
}
main();
