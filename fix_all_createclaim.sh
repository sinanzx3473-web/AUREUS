#!/bin/bash

# Fix all createClaim calls to include the 4th parameter (skillIndex)

cd contracts

# Fix test files - add ", 0" before closing parenthesis for 3-argument calls
# Pattern: createClaim("...", "...", "...") -> createClaim("...", "...", "...", 0)

# Fix SkillClaim.t.sol
sed -i 's/createClaim(\([^)]*\), "\([^"]*\)", "\([^"]*\)")/createClaim(\1, "\2", "\3", 0)/g' test/SkillClaim.t.sol

# Fix DoS.t.sol - multi-line calls
sed -i '/createClaim(/,/)/{s/string(abi\.encodePacked("Skill", vm\.toString(i))),$/string(abi.encodePacked("Skill", vm.toString(i))),/; s/"Desc",$/&/; s/"ipfs:\/\/evidence"$/"ipfs:\/\/evidence",/; s/"ipfs:\/\/evidence",$/&\n                0/}' test/DoS.t.sol

# Fix LargeDataset.t.sol - multi-line calls  
sed -i '/createClaim(/,/)/{s/string(abi\.encodePacked("Skill", vm\.toString(i))),$/string(abi.encodePacked("Skill", vm.toString(i))),/; s/"Description",$/&/; s/"ipfs:\/\/evidence"$/"ipfs:\/\/evidence",/; s/"ipfs:\/\/evidence",$/&\n                0/}' test/LargeDataset.t.sol

# Fix Performance.t.sol - multi-line calls
sed -i '/createClaim(/,/)/{s/"Solidity",$/&/; s/"Evidence",$/&/; s/"ipfs:\/\/evidence"$/"ipfs:\/\/evidence",/; s/"ipfs:\/\/evidence",$/&\n                    0/}' test/Performance.t.sol

# Fix SkillClaim.pagination.t.sol - multi-line calls
sed -i '/createClaim(/,/)/{s/string(abi\.encodePacked("Skill", vm\.toString(i))),$/string(abi.encodePacked("Skill", vm.toString(i))),/; s/"Description",$/&/; s/"ipfs:\/\/evidence"$/"ipfs:\/\/evidence",/; s/"ipfs:\/\/evidence",$/&\n                0/}' test/SkillClaim.pagination.t.sol

# Fix deployment scripts
sed -i 's/new SkillClaim(deployer, agentOracleProxy)/new SkillClaim(deployer, agentOracleProxy, skillProfileProxy)/g' script/DeployUpgradeable.s.sol
sed -i 's/new SkillClaim(address(timelock), address(agentOracle))/new SkillClaim(address(timelock), address(agentOracle), address(skillProfile))/g' script/DeployWithTimelock.s.sol
sed -i 's/new SkillClaim(deployer, address(newAgentOracle))/new SkillClaim(deployer, address(newAgentOracle), address(skillProfile))/g' script/Upgrade.s.sol

echo "All createClaim calls fixed"
