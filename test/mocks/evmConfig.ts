export const contracts = {
  skillProfile: {
    address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    abi: [
      {
        name: 'createProfile',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'name', type: 'string' },
          { name: 'bio', type: 'string' },
          { name: 'location', type: 'string' },
          { name: 'website', type: 'string' },
          { name: 'skills', type: 'string[]' },
        ],
        outputs: [],
      },
    ],
  },
  skillClaim: {
    address: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    abi: [
      {
        name: 'createClaim',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'skillName', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'evidenceUrl', type: 'string' },
        ],
        outputs: [],
      },
      {
        name: 'claimSkill',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'skillName', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'proficiencyLevel', type: 'uint8' },
          { name: 'evidenceUri', type: 'string' },
        ],
        outputs: [],
      },
    ],
  },
  endorsement: {
    address: '0x3333333333333333333333333333333333333333' as `0x${string}`,
    abi: [],
  },
  verifierRegistry: {
    address: '0x4444444444444444444444444444444444444444' as `0x${string}`,
    abi: [],
  },
};

export const selectedChain = {
  network: 'sepolia',
  chainId: 11155111,
  name: 'Sepolia',
};
