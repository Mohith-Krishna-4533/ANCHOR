async function main() {
  const AlertRegistry = await ethers.getContractFactory("AlertRegistry");

  const contract = await AlertRegistry.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("=================================");
  console.log("AlertRegistry deployed to:", address);
  console.log("=================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });