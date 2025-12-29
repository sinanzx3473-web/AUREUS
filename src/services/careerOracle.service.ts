import OpenAI from 'openai';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SkillData {
  skill_tag: string;
  is_verified: boolean;
  endorsement_count: number;
}

interface ColosseumStats {
  totalDuels: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWager: number;
  totalEarnings: number;
}

interface MarketData {
  skillTag: string;
  averageSalary: number;
  demandScore: number;
  growthRate: number;
}

interface CareerProphecy {
  predictedSalary12Months: number;
  currentMarketValue: number;
  recommendedNextSkill: {
    skill: string;
    roi: number;
    reasoning: string;
  };
  tier1HiringProbability: number;
  marketComparison: {
    userScore: number;
    marketAverage: number;
    percentile: number;
  };
  strengthsAnalysis: string[];
  growthOpportunities: string[];
  aiInsights: string;
}

export class CareerOracleService {
  /**
   * Get user's verified skills with endorsement counts
   */
  private async getUserSkills(walletAddress: string): Promise<SkillData[]> {
    const result = await query(
      `SELECT 
        s.skill_tag,
        s.is_verified,
        COUNT(e.endorsement_id) as endorsement_count
      FROM profiles p
      JOIN skills s ON p.profile_id = s.profile_id
      LEFT JOIN endorsements e ON s.skill_id = e.skill_id
      WHERE p.wallet_address = $1
      GROUP BY s.skill_id, s.skill_tag, s.is_verified
      ORDER BY s.is_verified DESC, endorsement_count DESC`,
      [walletAddress.toLowerCase()]
    );

    return result.rows;
  }

  /**
   * Get user's Colosseum duel statistics
   */
  private async getColosseumStats(walletAddress: string): Promise<ColosseumStats> {
    // Note: This assumes TheColosseum events are indexed in the database
    // You'll need to add indexing for DuelResolved events
    const result = await query(
      `SELECT 
        COUNT(*) as total_duels,
        SUM(CASE WHEN winner = $1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner != $1 THEN 1 ELSE 0 END) as losses,
        AVG(wager_amount) as average_wager,
        SUM(CASE WHEN winner = $1 THEN winner_payout ELSE 0 END) as total_earnings
      FROM colosseum_duels
      WHERE (challenger = $1 OR opponent = $1) AND status = 'Resolved'`,
      [walletAddress.toLowerCase()]
    );

    const stats = result.rows[0];
    const totalDuels = parseInt(stats.total_duels) || 0;
    const wins = parseInt(stats.wins) || 0;
    const losses = parseInt(stats.losses) || 0;

    return {
      totalDuels,
      wins,
      losses,
      winRate: totalDuels > 0 ? (wins / totalDuels) * 100 : 0,
      averageWager: parseFloat(stats.average_wager) || 0,
      totalEarnings: parseFloat(stats.total_earnings) || 0,
    };
  }

  /**
   * Get market data for skills (mock data - replace with real API)
   */
  private async getMarketData(skills: SkillData[]): Promise<MarketData[]> {
    // Mock market data - in production, integrate with salary APIs like:
    // - Glassdoor API
    // - LinkedIn Salary Insights
    // - Stack Overflow Developer Survey
    const marketDataMap: Record<string, MarketData> = {
      'Solidity': { skillTag: 'Solidity', averageSalary: 145000, demandScore: 92, growthRate: 35 },
      'Rust': { skillTag: 'Rust', averageSalary: 155000, demandScore: 88, growthRate: 42 },
      'TypeScript': { skillTag: 'TypeScript', averageSalary: 125000, demandScore: 95, growthRate: 28 },
      'React': { skillTag: 'React', averageSalary: 120000, demandScore: 98, growthRate: 22 },
      'Node.js': { skillTag: 'Node.js', averageSalary: 118000, demandScore: 94, growthRate: 25 },
      'Python': { skillTag: 'Python', averageSalary: 130000, demandScore: 96, growthRate: 30 },
      'Go': { skillTag: 'Go', averageSalary: 140000, demandScore: 85, growthRate: 38 },
      'Smart Contracts': { skillTag: 'Smart Contracts', averageSalary: 150000, demandScore: 90, growthRate: 40 },
      'DeFi': { skillTag: 'DeFi', averageSalary: 160000, demandScore: 87, growthRate: 45 },
      'Web3': { skillTag: 'Web3', averageSalary: 135000, demandScore: 89, growthRate: 36 },
    };

    return skills.map(skill => 
      marketDataMap[skill.skill_tag] || {
        skillTag: skill.skill_tag,
        averageSalary: 100000,
        demandScore: 70,
        growthRate: 20,
      }
    );
  }

  /**
   * Generate career prophecy using OpenAI
   */
  async generateCareerProphecy(walletAddress: string): Promise<CareerProphecy> {
    try {
      // Gather all data
      const skills = await this.getUserSkills(walletAddress);
      const colosseumStats = await this.getColosseumStats(walletAddress);
      const marketData = await this.getMarketData(skills);

      if (skills.length === 0) {
        throw new Error('No skills found for this profile');
      }

      // Calculate current market value based on verified skills
      const verifiedSkills = skills.filter(s => s.is_verified);
      const currentMarketValue = marketData
        .filter(md => verifiedSkills.some(s => s.skill_tag === md.skillTag))
        .reduce((sum, md) => sum + md.averageSalary, 0) / Math.max(verifiedSkills.length, 1);

      // Prepare data for AI analysis
      const userProfile = {
        verifiedSkills: verifiedSkills.map(s => ({
          skill: s.skill_tag,
          endorsements: s.endorsement_count,
        })),
        unverifiedSkills: skills.filter(s => !s.is_verified).map(s => s.skill_tag),
        colosseumPerformance: {
          winRate: colosseumStats.winRate.toFixed(1),
          totalDuels: colosseumStats.totalDuels,
          totalEarnings: colosseumStats.totalEarnings,
        },
        marketData: marketData.map(md => ({
          skill: md.skillTag,
          salary: md.averageSalary,
          demand: md.demandScore,
          growth: md.growthRate,
        })),
      };

      // Call OpenAI for career analysis
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an elite AI career advisor specializing in blockchain and software engineering careers. 
Analyze the user's skill profile, competitive coding performance, and market data to provide precise career predictions.
Respond in JSON format with the following structure:
{
  "predictedSalary12Months": number,
  "recommendedNextSkill": {
    "skill": string,
    "roi": number (percentage),
    "reasoning": string
  },
  "tier1HiringProbability": number (0-100),
  "marketPercentile": number (0-100),
  "strengthsAnalysis": [string array of 3-5 key strengths],
  "growthOpportunities": [string array of 3-5 opportunities],
  "aiInsights": string (2-3 sentences of strategic career advice)
}`,
          },
          {
            role: 'user',
            content: `Analyze this developer profile and predict their career trajectory:

${JSON.stringify(userProfile, null, 2)}

Current estimated market value: $${currentMarketValue.toFixed(0)}

Provide a data-driven 12-month salary prediction, recommend the highest ROI skill to learn next, 
estimate their probability of being hired by FAANG/Tier 1 companies, and identify their market percentile.`,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

      // Calculate market comparison
      const allSkillsScore = skills.reduce((sum, s) => {
        const market = marketData.find(md => md.skillTag === s.skill_tag);
        return sum + (market?.demandScore || 0) * (s.is_verified ? 1.5 : 1);
      }, 0);

      const marketAverage = marketData.reduce((sum, md) => sum + md.demandScore, 0) / marketData.length;

      return {
        predictedSalary12Months: aiResponse.predictedSalary12Months || currentMarketValue * 1.15,
        currentMarketValue,
        recommendedNextSkill: aiResponse.recommendedNextSkill || {
          skill: 'Rust',
          roi: 35,
          reasoning: 'High demand in blockchain infrastructure with 42% growth rate',
        },
        tier1HiringProbability: aiResponse.tier1HiringProbability || 65,
        marketComparison: {
          userScore: allSkillsScore,
          marketAverage,
          percentile: aiResponse.marketPercentile || 75,
        },
        strengthsAnalysis: aiResponse.strengthsAnalysis || [
          'Strong verified skill portfolio',
          'Competitive coding performance',
          'Blockchain specialization',
        ],
        growthOpportunities: aiResponse.growthOpportunities || [
          'Expand into emerging Web3 technologies',
          'Increase endorsement network',
          'Participate in more competitive challenges',
        ],
        aiInsights: aiResponse.aiInsights || 
          'Your verified skills and competitive performance position you well for senior blockchain roles. Focus on expanding your DeFi expertise to maximize earning potential.',
      };
    } catch (error) {
      logger.error('Career prophecy generation failed', error);
      throw error;
    }
  }

  /**
   * Get radar chart data for market comparison
   */
  async getRadarChartData(walletAddress: string) {
    const skills = await this.getUserSkills(walletAddress);
    const marketData = await this.getMarketData(skills);
    const colosseumStats = await this.getColosseumStats(walletAddress);

    // Calculate normalized scores (0-100)
    const verifiedSkillsScore = (skills.filter(s => s.is_verified).length / Math.max(skills.length, 1)) * 100;
    const endorsementScore = Math.min((skills.reduce((sum, s) => sum + s.endorsement_count, 0) / skills.length) * 10, 100);
    const competitiveScore = colosseumStats.winRate;
    const marketDemandScore = marketData.reduce((sum, md) => sum + md.demandScore, 0) / Math.max(marketData.length, 1);
    const growthPotentialScore = marketData.reduce((sum, md) => sum + md.growthRate, 0) / Math.max(marketData.length, 1) * 2;

    return {
      user: [
        { category: 'Verified Skills', value: verifiedSkillsScore },
        { category: 'Endorsements', value: endorsementScore },
        { category: 'Competitive Win Rate', value: competitiveScore },
        { category: 'Market Demand', value: marketDemandScore },
        { category: 'Growth Potential', value: Math.min(growthPotentialScore, 100) },
      ],
      marketAverage: [
        { category: 'Verified Skills', value: 60 },
        { category: 'Endorsements', value: 45 },
        { category: 'Competitive Win Rate', value: 50 },
        { category: 'Market Demand', value: 70 },
        { category: 'Growth Potential', value: 55 },
      ],
    };
  }
}

export const careerOracleService = new CareerOracleService();
