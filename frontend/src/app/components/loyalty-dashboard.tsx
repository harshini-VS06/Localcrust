import { useState, useEffect } from "react";
import { Award, Star, TrendingUp, Gift, Lock, Trophy, Crown } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { loyaltyAPI, type LoyaltyInfo, type Badge } from "@/api/features";

export function LoyaltyDashboard() {
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const [infoData, badgesData] = await Promise.all([
        loyaltyAPI.getLoyaltyInfo(),
        loyaltyAPI.getBadges(),
      ]);
      
      setLoyaltyInfo(infoData);
      setBadges(badgesData.badges);
      setAvailableBadges(badgesData.available_badges);
    } catch (error) {
      console.error("Failed to load loyalty data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Bronze': return 'from-amber-700 to-amber-900';
      case 'Silver': return 'from-gray-400 to-gray-600';
      case 'Gold': return 'from-yellow-400 to-yellow-600';
      case 'Platinum': return 'from-cyan-400 to-cyan-600';
      case 'Diamond': return 'from-purple-400 to-purple-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Diamond': return <Crown className="w-8 h-8" />;
      case 'Platinum': return <Trophy className="w-8 h-8" />;
      case 'Gold': return <Award className="w-8 h-8" />;
      default: return <Star className="w-8 h-8" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent"></div>
      </div>
    );
  }

  if (!loyaltyInfo) {
    return (
      <div className="text-center py-20">
        <p className="text-[#4E342E]/70">Unable to load loyalty information</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Level Card */}
      <Card className={`bg-gradient-to-br ${getLevelColor(loyaltyInfo.level)} border-0 rounded-3xl overflow-hidden hover-lift`}>
        <CardContent className="p-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/80 text-sm mb-2">Your Level</p>
              <h2 className="text-4xl font-bold">{loyaltyInfo.level}</h2>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              {getLevelIcon(loyaltyInfo.level)}
            </div>
          </div>

          {/* Points Display */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/90">Total Points</span>
              <span className="text-3xl font-bold">{loyaltyInfo.total_points}</span>
            </div>
            <div className="text-white/80 text-sm">
              <Star className="w-4 h-4 inline mr-1" />
              Earn 10 points per $1 spent
            </div>
          </div>

          {/* Progress to Next Level */}
          {loyaltyInfo.next_level && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/90">Progress to {loyaltyInfo.next_level}</span>
                <span className="text-white/90">{loyaltyInfo.progress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${loyaltyInfo.progress}%` }}
                ></div>
              </div>
              <p className="text-white/80 text-sm mt-3">
                {loyaltyInfo.points_needed} more points to level up!
              </p>
            </div>
          )}

          {loyaltyInfo.level === 'Diamond' && (
            <div className="text-center py-4">
              <Crown className="w-12 h-12 mx-auto mb-3 text-yellow-300" />
              <p className="text-white text-lg font-medium">You've reached the highest level!</p>
              <p className="text-white/80 text-sm mt-2">Enjoy exclusive perks and benefits</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level Benefits */}
      <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10 hover-lift">
        <CardContent className="p-6">
          <h3 className="text-2xl text-[#4E342E] mb-4 flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#D35400]" />
            {loyaltyInfo.level} Benefits
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {loyaltyInfo.level === 'Bronze' && (
              <>
                <div className="flex items-start gap-3 p-4 bg-[#FFF9F5] rounded-xl">
                  <div className="w-8 h-8 bg-[#D35400] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4E342E]">Points on Purchases</p>
                    <p className="text-sm text-[#4E342E]/70">Earn 10 points per $1</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF9F5] rounded-xl">
                  <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4E342E]">Birthday Surprise</p>
                    <p className="text-sm text-[#4E342E]/70">Special gift on your birthday</p>
                  </div>
                </div>
              </>
            )}

            {['Silver', 'Gold', 'Platinum', 'Diamond'].includes(loyaltyInfo.level) && (
              <>
                <div className="flex items-start gap-3 p-4 bg-[#FFF9F5] rounded-xl">
                  <div className="w-8 h-8 bg-[#D35400] rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4E342E]">Bonus Points</p>
                    <p className="text-sm text-[#4E342E]/70">+20% extra points on purchases</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF9F5] rounded-xl">
                  <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4E342E]">Early Access</p>
                    <p className="text-sm text-[#4E342E]/70">New products before others</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF9F5] rounded-xl">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4E342E]">Priority Support</p>
                    <p className="text-sm text-[#4E342E]/70">Faster response times</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF9F5] rounded-xl">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[#4E342E]">Exclusive Deals</p>
                    <p className="text-sm text-[#4E342E]/70">Special discounts for you</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Badges Section */}
      <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
        <CardContent className="p-6">
          <h3 className="text-2xl text-[#4E342E] mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#D35400]" />
            Achievement Badges
          </h3>

          {/* Earned Badges */}
          {badges.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-[#4E342E]/60 mb-3">Earned ({badges.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.badge_key}
                    className="p-4 bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] rounded-2xl text-center hover-lift animate-scaleIn"
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <p className="font-medium text-[#4E342E] text-sm">{badge.name}</p>
                    <p className="text-xs text-[#4E342E]/70 mt-1">{badge.description}</p>
                    <div className="mt-2 inline-flex items-center gap-1 bg-white px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 text-[#D35400]" />
                      <span className="text-xs text-[#D35400] font-medium">+{badge.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Badges */}
          {availableBadges.length > 0 && (
            <div>
              <p className="text-sm text-[#4E342E]/60 mb-3">Available to Earn</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableBadges.map((badge) => (
                  <div
                    key={badge.badge_key}
                    className="p-4 bg-gray-100 rounded-2xl text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="text-4xl mb-2 opacity-30">{badge.icon}</div>
                    <p className="font-medium text-[#4E342E]/50 text-sm">{badge.name}</p>
                    <p className="text-xs text-[#4E342E]/40 mt-1">{badge.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {badges.length === 0 && availableBadges.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
              <p className="text-[#4E342E]/70">Start shopping to earn badges!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level Progression */}
      <Card className="bg-gradient-to-br from-[#F1F8E9] to-[#C8E6C9] rounded-2xl border-0">
        <CardContent className="p-6">
          <h3 className="text-2xl text-[#4E342E] mb-4">Level Progression</h3>
          <div className="space-y-4">
            {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((level, index) => {
              const isCurrentLevel = level === loyaltyInfo.level;
              const isPastLevel = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].indexOf(level) <
                                  ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].indexOf(loyaltyInfo.level);
              
              return (
                <div
                  key={level}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isCurrentLevel
                      ? 'bg-white shadow-lg scale-105'
                      : isPastLevel
                      ? 'bg-white/60'
                      : 'bg-white/30'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isPastLevel || isCurrentLevel
                      ? `bg-gradient-to-br ${getLevelColor(level)}`
                      : 'bg-gray-300'
                  }`}>
                    {isPastLevel || isCurrentLevel ? (
                      <Star className="w-6 h-6 text-white" />
                    ) : (
                      <Lock className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentLevel ? 'text-[#D35400]' : 'text-[#4E342E]'}`}>
                      {level}
                      {isCurrentLevel && (
                        <span className="ml-2 text-xs bg-[#D35400] text-white px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[#4E342E]/70">
                      {level === 'Bronze' && '0+ points'}
                      {level === 'Silver' && '500+ points'}
                      {level === 'Gold' && '1,500+ points'}
                      {level === 'Platinum' && '3,000+ points'}
                      {level === 'Diamond' && '5,000+ points'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
