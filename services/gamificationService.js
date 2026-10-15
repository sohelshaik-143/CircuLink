// services/gamificationService.js
// Points, levels, badges, streaks powered by MySQL 8

const pool = require('../config/mysql');

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
  CREATE_POST:      10,
  CREATE_RESEARCH:  20,
  COMMENT:           5,
  LIKE_RECEIVED:     2,
  ENDORSE_RECEIVED: 50,
  CIRCULAR_APPROVED: 15,
  DAILY_LOGIN:       3,
  STREAK_BONUS:     25,
};

class GamificationService {
  static async awardPoints(userId, action) {
    const pts = POINT_ACTIONS[action] || 0;
    if (!pts) return { pts: 0, newLevel: null, newBadges: [] };

    await pool.query('UPDATE users SET points = points + ? WHERE id = ?', [pts, userId]);

    const [rows] = await pool.query('SELECT points, level FROM users WHERE id = ?', [userId]);
    if (!rows.length) return { pts: 0 };

    const currentPoints = rows[0].points;
    const currentLevel = rows[0].level;
    const newLevel = getLevel(currentPoints);
    const newBadges = [];

    if (currentLevel !== newLevel) {
      await pool.query('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId]);
    }

    if (currentPoints >= 500) {
      await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, "Top Contributor")', [userId]);
      newBadges.push('Top Contributor');
    }

    return { pts, newLevel: currentLevel !== newLevel ? newLevel : null, newBadges };
  }

  static async checkBadges(userId) {
    const [[posts]] = await pool.query('SELECT COUNT(*) as cnt FROM posts WHERE author_id = ? AND status = "PUBLISHED"', [userId]);
    const [[likes]] = await pool.query('SELECT COUNT(*) as cnt FROM post_likes pl JOIN posts p ON pl.post_id = p.id WHERE p.author_id = ?', [userId]);
    const newBadges = [];

    if (posts.cnt >= 1) {
      await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, "First Post")', [userId]);
      newBadges.push('First Post');
    }
    if (posts.cnt >= 5) {
      await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, "Innovator")', [userId]);
      newBadges.push('Innovator');
    }
    if (likes.cnt >= 5) {
      await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, "Trendsetter")', [userId]);
      newBadges.push('Trendsetter');
    }

    return newBadges;
  }

  static async recordLogin(userId) {
    await pool.query('UPDATE users SET streak_days = streak_days + 1, last_active_date = CURDATE(), points = points + ? WHERE id = ?', [POINT_ACTIONS.DAILY_LOGIN, userId]);
    return { streak: 1 };
  }

  static getPointsForAction(action) {
    return POINT_ACTIONS[action] || 0;
  }
}

module.exports = GamificationService;
