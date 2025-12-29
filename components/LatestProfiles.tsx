import { useLatestProfiles } from '../hooks/useLatestProfiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Users, Award, Briefcase } from 'lucide-react';

export interface LatestProfilesProps {
  limit?: number;
}

export function LatestProfiles({ limit = 10 }: LatestProfilesProps) {
  const { profiles, isLoading, error } = useLatestProfiles(limit);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="font-neopixel text-red-900 dark:text-red-100">
            Error Loading Profiles
          </CardTitle>
          <CardDescription className="text-red-700 dark:text-red-300">
            {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-blue-600" />
        <h2 className="font-neopixel text-3xl font-bold text-gray-900 dark:text-white">
          Latest Verified Profiles
        </h2>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card
              key={profile.address}
              className="transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
            >
              <CardHeader>
                <CardTitle className="font-neopixel text-xl">
                  {profile.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {profile.bio}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-mono text-xs">
                    {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.skillCount !== undefined && (
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {profile.skillCount} Skills
                    </Badge>
                  )}
                  {profile.endorsementCount !== undefined && (
                    <Badge variant="secondary" className="gap-1">
                      <Award className="h-3 w-3" />
                      {profile.endorsementCount} Endorsements
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-gray-400 dark:text-gray-400">
                  Joined {formatTimeAgo(profile.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && profiles.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="font-neopixel text-center text-gray-600 dark:text-gray-400">
              No Profiles Yet
            </CardTitle>
            <CardDescription className="text-center">
              Be the first to create a verified AUREUS profile!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}
