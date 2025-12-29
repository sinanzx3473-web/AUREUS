import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Target, 
  Award, 
  Sparkles, 
  ArrowLeft,
  Brain,
  Zap,
  Trophy,
  DollarSign
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

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

interface RadarData {
  user: Array<{ category: string; value: number }>;
  marketAverage: Array<{ category: string; value: number }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export default function CareerProphecy() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [prophecy, setProphecy] = useState<CareerProphecy | null>(null);
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/profile');
      return;
    }

    fetchProphecy();
  }, [address, isConnected]);

  const fetchProphecy = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const [prophecyRes, radarRes] = await Promise.all([
        fetch(`${API_BASE_URL}/career-oracle/${address}/prophecy`),
        fetch(`${API_BASE_URL}/career-oracle/${address}/radar`)
      ]);

      if (!prophecyRes.ok || !radarRes.ok) {
        throw new Error('Failed to fetch career prophecy');
      }

      const prophecyData = await prophecyRes.json();
      const radarDataRes = await radarRes.json();

      setProphecy(prophecyData.data);
      setRadarData(radarDataRes.data);
    } catch (err) {
      console.error('Error fetching prophecy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load career prophecy');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-400';
    if (probability >= 60) return 'text-blue-400';
    if (probability >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'from-purple-500 to-pink-500';
    if (percentile >= 75) return 'from-blue-500 to-cyan-500';
    if (percentile >= 50) return 'from-green-500 to-emerald-500';
    return 'from-yellow-500 to-orange-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !prophecy || !radarData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 flex items-center justify-center">
        <Card className="max-w-md bg-slate-900/50 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Prophecy</CardTitle>
            <CardDescription className="text-slate-400">
              {error || 'Unable to generate career prophecy. Please ensure you have verified skills.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/profile')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const combinedRadarData = prophecy && radarData ? radarData.user.map((item, index) => ({
    category: item.category,
    user: item.value,
    market: radarData.marketAverage[index].value,
  })) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              onClick={() => navigate('/profile')} 
              variant="ghost" 
              className="mb-4 text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
              Career Oracle Prophecy
            </h1>
            <p className="text-slate-400 mt-2">AI-Powered Career Trajectory Analysis</p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Predicted Salary */}
          <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                12-Month Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-300">
                {formatCurrency(prophecy.predictedSalary12Months)}
              </div>
              <p className="text-xs text-green-400/60 mt-1">
                +{((prophecy.predictedSalary12Months - prophecy.currentMarketValue) / prophecy.currentMarketValue * 100).toFixed(1)}% growth
              </p>
            </CardContent>
          </Card>

          {/* Current Market Value */}
          <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Current Market Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-300">
                {formatCurrency(prophecy.currentMarketValue)}
              </div>
              <p className="text-xs text-blue-400/60 mt-1">Based on verified skills</p>
            </CardContent>
          </Card>

          {/* Tier 1 Probability */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Tier 1 Hiring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getProbabilityColor(prophecy.tier1HiringProbability)}`}>
                {prophecy.tier1HiringProbability}%
              </div>
              <p className="text-xs text-purple-400/60 mt-1">FAANG probability</p>
            </CardContent>
          </Card>

          {/* Market Percentile */}
          <Card className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-400 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Market Percentile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold bg-gradient-to-r ${getPercentileColor(prophecy.marketComparison.percentile)} bg-clip-text text-transparent`}>
                {prophecy.marketComparison.percentile}th
              </div>
              <p className="text-xs text-orange-400/60 mt-1">Top performer</p>
            </CardContent>
          </Card>
        </div>

        {/* Radar Chart */}
        <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Skills vs Market Average
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your performance metrics compared to industry standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={combinedRadarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#64748b' }}
                />
                <Radar
                  name="You"
                  dataKey="user"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Market Average"
                  dataKey="market"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.3}
                />
                <Legend 
                  wrapperStyle={{ color: '#94a3b8' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recommended Next Skill */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recommended Next Skill
            </CardTitle>
            <CardDescription className="text-slate-400">
              Highest ROI skill to maximize your career growth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-purple-300">
                  {prophecy.recommendedNextSkill.skill}
                </h3>
                <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                  +{prophecy.recommendedNextSkill.roi}% ROI
                </Badge>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {prophecy.recommendedNextSkill.reasoning}
            </p>
          </CardContent>
        </Card>

        {/* AI Insights & Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strengths */}
          <Card className="bg-slate-900/50 border-green-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {prophecy.strengthsAnalysis.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                    </div>
                    <span className="text-slate-300">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Growth Opportunities */}
          <Card className="bg-slate-900/50 border-blue-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {prophecy.growthOpportunities.map((opportunity, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    </div>
                    <span className="text-slate-300">{opportunity}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* AI Strategic Insights */}
        <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Strategic Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-200 text-lg leading-relaxed">
              {prophecy.aiInsights}
            </p>
          </CardContent>
        </Card>

        <Separator className="bg-slate-700/50" />

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm pb-6">
          <p>Powered by OpenAI GPT-4 • Data updated in real-time from blockchain events</p>
        </div>
      </div>
    </div>
  );
}
