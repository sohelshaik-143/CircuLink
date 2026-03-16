// services/gamificationService.js
// Points, levels, badges, streaks

const User = require('../models/User');

const BADGES = {
  FIRST_POST:      { name: 'First Post', pts: 0,   trigger: 'posts >= 1'   },
  INNOVATOR:       { name: 'Innovator',  pts: 0,   trigger: 'posts >= 5'   },
  SOCIAL_HERO:     { name: 'Social Hero',pts: 0,   trigger: 'socialService >= 1' },
  ENDORSED_ONCE:   { name: 'Faculty Approved', pts: 0, trigger: 'endorsements >= 1' },
  TOP_CONTRIBUTOR: { name: 'Top Contributor', pts: 0, trigger: 'points >= 500' },
  RESEARCH_STAR:   { name: 'Research Star', pts: 0, trigger: 'research >= 2' },
  TRENDSETTER:     { name: 'Trendsetter', pts: 0, trigger: 'likes >= 50' },
  COMMUNITY_BUILDER: { name: 'Community Builder', pts: 0, trigger: 'followers >= 10' },
  STREAK_WEEK:     { name: '7-Day Streak', pts: 0, trigger: 'streak >= 7' },
};

const LEVEL_THRESHOLDS = {
  Beginner:     0,
  Intermediate: 200,
  Advanced:     500,
  Expert:       1000,
};

const getLevel = (points) => {
  if (points >= 1000) return 'Expert';
  if (points >= 500) return 'Advanced';
  if (points >= 200) return 'Intermediate';
  return 'Beginner';
};

const POINT_ACTIONS = {
  CREATE_POST:     10,
  CREATE_RESEARCH: 20,
  COMMENT:          5,
  LIKE_RECEIVED:    2,
  ENDORSE_RECEIVED: 50,
  CIRCULAR_APPROVED: 15,
  DAILY_LOGIN:      3,
  STREAK_BONUS:    25,  // per 7-day streak
};

class GamificationService {
  // Award points for an action
  static async awardPoints(userId, action) {
    const pts = POINT_ACTIONS[action] || 0;
    if (!pts) return { pts: 0, newLevel: null, newBadges: [] };

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: pts } },
      { new: true }
    );

    const newLevel = getLevel(user.points);
    const updates = { level: newLevel };
    const newBadges = [];

    // Check for level-up
    if (user.level !== newLevel) {
      updates.level = newLevel;
    }

    // Check badge conditions
    if (user.points >= 500 && !user.badges.includes('Top Contributor')) {
      updates.$addToSet = { badges: 'Top Contributor' };
      newBadges.push('Top Contributor');
    }

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(userId, updates);
    }

    return { pts, newLevel: user.level !== newLevel ? newLevel : null, newBadges };
  }

  // Check and award badges based on current state
  static async checkBadges(userId) {
    const Post = require('../models/Post');
    const user = await User.findById(userId);
    if (!user) return [];

    const [postCount, socialCount, endorsements] = await Promise.all([
      Post.countDocuments({ author: userId, status: 'PUBLISHED' }),
      Post.countDocuments({ author: userId, type: 'SOCIAL_SERVICE', status: 'PUBLISHED' }),
      Post.aggregate([
        { $match: { author: userId } },
        { $group: { _id: null, total: { $sum: { $size: '$endorsements' } } } },
      ]),
    ]);

    const totalEndorsements = endorsements[0]?.total || 0;
    const newBadges = [];
    const toAdd = [];

    if (postCount >= 1 && !user.badges.includes('First Post')) {
      toAdd.push('First Post'); newBadges.push('First Post');
    }
    if (postCount >= 5 && !user.badges.includes('Innovator')) {
      toAdd.push('Innovator'); newBadges.push('Innovator');
    }
    if (socialCount >= 1 && !user.badges.includes('Social Hero')) {
      toAdd.push('Social Hero'); newBadges.push('Social Hero');
    }
    if (totalEndorsements >= 1 && !user.badges.includes('Faculty Approved')) {
      toAdd.push('Faculty Approved'); newBadges.push('Faculty Approved');
    }
    if (user.followersCount >= 10 && !user.badges.includes('Community Builder')) {
      toAdd.push('Community Builder'); newBadges.push('Community Builder');
    }

    if (toAdd.length > 0) {
      await User.findByIdAndUpdate(userId, { $addToSet: { badges: { $each: toAdd } } });
    }

    return newBadges;
  }

  // Record daily login streak
  static async recordLogin(userId) {
    const user = await User.findById(userId);
    const today = new Date().toDateString();
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;

    let newStreak = user.streak || 0;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lastActive === yesterday) {
        newStreak += 1;
      } else if (lastActive !== today) {
        newStreak = 1;
      }

      const updates = {
        streak: newStreak,
        lastActiveDate: new Date(),
        $inc: { points: POINT_ACTIONS.DAILY_LOGIN },
      };

      if (newStreak % 7 === 0) {
        updates.$inc.points += POINT_ACTIONS.STREAK_BONUS;
      }

      await User.findByIdAndUpdate(userId, updates);
    }

    return { streak: newStreak };
  }

  static getPointsForAction(action) {
    return POINT_ACTIONS[action] || 0;
  }

  static getBadgeList() {
    return Object.values(BADGES).map(b => b.name);
  }
}

module.exports = GamificationService;
