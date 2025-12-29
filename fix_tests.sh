#!/bin/bash

# Fix all test files to match new SkillClaim constructor and createClaim signatures

cd contracts/test

# Fix DoS.t.sol
sed -i 's/skillClaim = new SkillClaim(admin, address(agentOracle));/skillProfile = new SkillProfile(admin);\n        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));/g' DoS.t.sol
sed -i 's/SkillClaim public skillClaim;/SkillClaim public skillClaim;\n    SkillProfile public skillProfile;/g' DoS.t.sol
sed -i 's/import "..\/src\/AgentOracle.sol";/import "..\/src\/AgentOracle.sol";\nimport "..\/src\/SkillProfile.sol";/g' DoS.t.sol
sed -i 's/skillClaim\.createClaim(/skillClaim.createClaim(/g' DoS.t.sol

# Fix Integration.t.sol  
sed -i 's/skillClaim = new SkillClaim(admin, address(agentOracle));/skillProfile = new SkillProfile(admin);\n        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));/g' Integration.t.sol
sed -i 's/SkillClaim public skillClaim;/SkillClaim public skillClaim;\n    SkillProfile public skillProfile;/g' Integration.t.sol
sed -i 's/import "..\/src\/AgentOracle.sol";/import "..\/src\/AgentOracle.sol";\nimport "..\/src\/SkillProfile.sol";/g' Integration.t.sol

# Fix Performance.t.sol
sed -i 's/skillClaim = new SkillClaim(admin, address(agentOracle));/skillProfile = new SkillProfile(admin);\n        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));/g' Performance.t.sol
sed -i 's/SkillClaim public skillClaim;/SkillClaim public skillClaim;\n    SkillProfile public skillProfile;/g' Performance.t.sol
sed -i 's/import "..\/src\/AgentOracle.sol";/import "..\/src\/AgentOracle.sol";\nimport "..\/src\/SkillProfile.sol";/g' Performance.t.sol

# Fix LargeDataset.t.sol
sed -i 's/skillClaim = new SkillClaim(admin, address(agentOracle));/skillProfile = new SkillProfile(admin);\n        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));/g' LargeDataset.t.sol
sed -i 's/SkillClaim public skillClaim;/SkillClaim public skillClaim;\n    SkillProfile public skillProfile;/g' LargeDataset.t.sol
sed -i 's/import "..\/src\/AgentOracle.sol";/import "..\/src\/AgentOracle.sol";\nimport "..\/src\/SkillProfile.sol";/g' LargeDataset.t.sol

# Fix SkillClaim.pagination.t.sol
sed -i 's/skillClaim = new SkillClaim(admin, address(agentOracle));/skillProfile = new SkillProfile(admin);\n        skillClaim = new SkillClaim(admin, address(agentOracle), address(skillProfile));/g' SkillClaim.pagination.t.sol
sed -i 's/SkillClaim public skillClaim;/SkillClaim public skillClaim;\n    SkillProfile public skillProfile;/g' SkillClaim.pagination.t.sol
sed -i 's/import "..\/src\/AgentOracle.sol";/import "..\/src\/AgentOracle.sol";\nimport "..\/src\/SkillProfile.sol";/g' SkillClaim.pagination.t.sol

echo "Test files updated successfully"
