import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Award, Share2, Check } from "lucide-react";
import { format } from "date-fns";
import { sanitizeText, sanitizeUrl } from "@/utils/sanitize";
import { useState, useMemo } from "react";
import { useAccount } from "wagmi";

interface SkillProfileCardProps {
  profile: {
    name: string;
    bio: string;
    location: string;
    website: string;
    skills: string[];
    experience: Array<{
      company: string;
      role: string;
      startDate: bigint;
      endDate: bigint;
      description: string;
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      graduationDate: bigint;
    }>;
    verifiedAt: bigint;
  };
}

interface SkillWithProficiency {
  name: string;
  proficiency: 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner';
}

export const SkillProfileCard = ({ profile }: SkillProfileCardProps) => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);
  const profileUrl = `${window.location.origin}/profile/${address}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name}'s AUREUS Profile`,
          text: 'Check out my blockchain-verified professional profile',
          url: profileUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Parse skills with proficiency levels (format: "Skill:Level" or just "Skill")
  const skillsWithProficiency = useMemo(() => {
    return profile.skills.map(skill => {
      const parts = skill.split(':');
      if (parts.length === 2) {
        const proficiency = parts[1].trim() as 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner';
        return { name: parts[0].trim(), proficiency };
      }
      return { name: skill, proficiency: 'Intermediate' as const };
    });
  }, [profile.skills]);

  return (
    <Card className="w-full bg-black/40 backdrop-blur-xl border-white/10 hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-3xl mb-2">{sanitizeText(profile.name)}</CardTitle>
            <CardDescription className="text-base text-electric-alabaster/70">{sanitizeText(profile.bio)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {profile.verifiedAt > 0n && (
              <Badge variant="default" className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                Verified
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
              aria-label="Share profile"
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" />Copied</>
              ) : (
                <><Share2 className="w-4 h-4 mr-2" />Share</>
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {sanitizeText(profile.location)}
            </div>
          )}
          {profile.website && sanitizeUrl(profile.website) && (
            <a href={sanitizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
              {sanitizeText(profile.website)}
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {skillsWithProficiency.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 font-header">Skills</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 auto-rows-[120px]">
              {skillsWithProficiency.map((skill, idx) => {
                const isExpert = skill.proficiency === 'Expert';
                return (
                  <div
                    key={idx}
                    className={`
                      bg-void-black border border-burnished-gold
                      flex flex-col items-center justify-center p-4
                      transition-all duration-300 hover:bg-burnished-gold/10
                      ${isExpert ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}
                    `}
                  >
                    <div className="text-center">
                      <p className={`font-mono font-semibold text-electric-alabaster ${
                        isExpert ? 'text-xl mb-2' : 'text-sm mb-1'
                      }`}>
                        {sanitizeText(skill.name)}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`border-burnished-gold text-burnished-gold ${
                          isExpert ? 'text-xs' : 'text-[10px]'
                        }`}
                      >
                        {skill.proficiency}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {profile.experience.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Experience</h3>
            <div className="space-y-4">
              {profile.experience.map((exp, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-4">
                  <h4 className="font-semibold">{sanitizeText(exp.role)}</h4>
                  <p className="text-sm text-muted-foreground">{sanitizeText(exp.company)}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(Number(exp.startDate) * 1000), 'MMM yyyy')} - 
                    {exp.endDate > 0n ? format(new Date(Number(exp.endDate) * 1000), 'MMM yyyy') : 'Present'}
                  </div>
                  {exp.description && <p className="text-sm mt-2">{sanitizeText(exp.description)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.education.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Education</h3>
            <div className="space-y-4">
              {profile.education.map((edu, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-4">
                  <h4 className="font-semibold">{sanitizeText(edu.degree)} in {sanitizeText(edu.field)}</h4>
                  <p className="text-sm text-muted-foreground">{sanitizeText(edu.institution)}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    Graduated {format(new Date(Number(edu.graduationDate) * 1000), 'MMM yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
