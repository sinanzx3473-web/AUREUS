import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

interface VerificationRequest {
  githubRepoUrl: string;
  skillName: string;
  claimId: number;
}

interface VerificationResult {
  claimId: number;
  isValid: boolean;
  signature: string;
  reasoning: string;
}

class VerifierAgentService {
  private openaiApiKey: string;
  private agentPrivateKey: string;
  private wallet: ethers.Wallet;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.agentPrivateKey = process.env.AGENT_PRIVATE_KEY || '';

    if (!this.openaiApiKey) {
      logger.error('OPENAI_API_KEY not configured');
      throw new Error('OPENAI_API_KEY is required for AI verification');
    }

    if (!this.agentPrivateKey) {
      logger.error('AGENT_PRIVATE_KEY not configured');
      throw new Error('AGENT_PRIVATE_KEY is required for signing verification results');
    }

    // Initialize wallet for signing
    this.wallet = new ethers.Wallet(this.agentPrivateKey);
    logger.info(`Verifier Agent initialized with address: ${this.wallet.address}`);
  }

  /**
   * Fetch repository content from GitHub
   */
  private async fetchGitHubRepo(repoUrl: string): Promise<string> {
    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub URL format');
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace('.git', '');

      // Fetch repository structure and key files
      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents`;
      const response = await axios.get(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Takumi-Verifier-Agent',
        },
      });

      // Get README and main code files
      const files = response.data;
      let repoContent = `Repository: ${owner}/${cleanRepo}\n\n`;

      // Fetch README
      const readmeFile = files.find((f: any) => 
        f.name.toLowerCase().startsWith('readme')
      );
      if (readmeFile) {
        const readmeResponse = await axios.get(readmeFile.download_url);
        repoContent += `README:\n${readmeResponse.data}\n\n`;
      }

      // Fetch main code files (limit to first 5 for token efficiency)
      const codeFiles = files
        .filter((f: any) => 
          f.type === 'file' && 
          (f.name.endsWith('.ts') || f.name.endsWith('.js') || 
           f.name.endsWith('.sol') || f.name.endsWith('.py') ||
           f.name.endsWith('.java') || f.name.endsWith('.go'))
        )
        .slice(0, 5);

      for (const file of codeFiles) {
        try {
          const fileResponse = await axios.get(file.download_url);
          repoContent += `File: ${file.name}\n${fileResponse.data}\n\n`;
        } catch (error) {
          logger.warn(`Failed to fetch file ${file.name}`, error);
        }
      }

      return repoContent;
    } catch (error) {
      logger.error('Failed to fetch GitHub repository', error);
      throw new Error('Failed to fetch repository content');
    }
  }

  /**
   * Analyze repository using OpenAI GPT-4o
   */
  private async analyzeWithAI(repoContent: string, skillName: string): Promise<{ isValid: boolean; reasoning: string }> {
    try {
      const systemPrompt = `You are a senior code auditor and technical interviewer. Your task is to analyze code repositories to verify if they demonstrate proficiency in specific skills.

Be strict and thorough in your evaluation. Only return TRUE if there is clear, substantial evidence of the skill being demonstrated in the codebase.

Return FALSE if:
- The skill is not present in the code
- The implementation is trivial or basic
- The code quality is poor
- There's insufficient evidence of proficiency

Provide a brief reasoning for your decision.`;

      const userPrompt = `Analyze this repository for proficiency in: ${skillName}

Repository Content:
${repoContent}

Does this code demonstrate ${skillName} proficiency? Respond in JSON format:
{
  "isValid": true/false,
  "reasoning": "Brief explanation of your decision"
}`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      return {
        isValid: result.isValid === true,
        reasoning: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      logger.error('OpenAI API call failed', error);
      throw new Error('AI analysis failed');
    }
  }

  /**
   * Sign the verification result
   */
  private async signVerification(claimId: number, isValid: boolean): Promise<string> {
    try {
      // Create message hash matching contract's expected format
      // keccak256(abi.encodePacked(claimId, isValid, address(this), block.chainid))
      const chainId = process.env.CHAIN_ID || '20258';
      const contractAddress = process.env.AGENT_ORACLE_ADDRESS || ethers.ZeroAddress;

      const messageHash = ethers.solidityPackedKeccak256(
        ['uint256', 'bool', 'address', 'uint256'],
        [claimId, isValid, contractAddress, chainId]
      );

      // Sign the message hash
      const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

      logger.info(`Signed verification for claim ${claimId}: ${isValid}`, {
        claimId,
        isValid,
        signature: signature.substring(0, 20) + '...',
      });

      return signature;
    } catch (error) {
      logger.error('Failed to sign verification', error);
      throw new Error('Signature generation failed');
    }
  }

  /**
   * Verify a skill claim using AI analysis
   */
  async verifySkillClaim(request: VerificationRequest): Promise<VerificationResult> {
    const { githubRepoUrl, skillName, claimId } = request;

    logger.info(`Starting AI verification for claim ${claimId}`, {
      claimId,
      skillName,
      githubRepoUrl,
    });

    try {
      // Step 1: Fetch repository content
      const repoContent = await this.fetchGitHubRepo(githubRepoUrl);

      // Step 2: Analyze with AI
      const analysis = await this.analyzeWithAI(repoContent, skillName);

      // Step 3: Sign the result
      const signature = await this.signVerification(claimId, analysis.isValid);

      logger.info(`AI verification completed for claim ${claimId}`, {
        claimId,
        isValid: analysis.isValid,
        reasoning: analysis.reasoning,
      });

      return {
        claimId,
        isValid: analysis.isValid,
        signature,
        reasoning: analysis.reasoning,
      };
    } catch (error) {
      logger.error(`AI verification failed for claim ${claimId}`, error);
      throw error;
    }
  }

  /**
   * Get agent wallet address
   */
  getAgentAddress(): string {
    return this.wallet.address;
  }
}

export default new VerifierAgentService();
