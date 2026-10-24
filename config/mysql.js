const mysql = require('mysql2/promise');

const isServerlessWithoutDb = Boolean(process.env.VERCEL) && !process.env.DATABASE_URL;

let pool;

if (isServerlessWithoutDb) {
  console.log('ℹ️ [CircuLink] Serverless Standby Mode active (no DATABASE_URL configured). Serving seeded RGUKT records.');

  const memoryUsers = [
    {
      id: 1,
      college_id: 'DIRECTOR01',
      email: 'director@rguktrkv.ac.in',
      password: '$2a$10$.xaJw2ZIpARvu5rADOkzpeXiTgrqoSeUdTRt8bYhzEQR0/X2hQ/R6',
      name: 'Prof. K. Venkata Ramana',
      role: 'DIRECTOR',
      branch: 'GENERAL',
      campus: 'RK Valley',
      points: 500,
      level: 'Advanced',
      mfa_enabled: 0,
      is_active: 1,
      joined_community: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      college_id: 'ADMIN01',
      email: 'admin@rguktrkv.ac.in',
      password: '$2a$10$.xaJw2ZIpARvu5rADOkzpeXiTgrqoSeUdTRt8bYhzEQR0/X2hQ/R6',
      name: 'RGUKT System Administrator',
      role: 'ADMIN',
      branch: 'GENERAL',
      campus: 'RK Valley',
      points: 1000,
      level: 'Expert',
      mfa_enabled: 0,
      is_active: 1,
      joined_community: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 3,
      college_id: 'DEAN01',
      email: 'dean.academics@rguktrkv.ac.in',
      password: '$2a$10$.xaJw2ZIpARvu5rADOkzpeXiTgrqoSeUdTRt8bYhzEQR0/X2hQ/R6',
      name: 'Dr. S. Chandra Sekhar',
      role: 'DEAN',
      branch: 'CSE',
      campus: 'RK Valley',
      points: 600,
      level: 'Advanced',
      mfa_enabled: 0,
      is_active: 1,
      joined_community: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 8,
      college_id: 'R220379',
      email: 'r220379@rguktrkv.ac.in',
      password: '$2a$10$.xaJw2ZIpARvu5rADOkzpeXiTgrqoSeUdTRt8bYhzEQR0/X2hQ/R6',
      name: 'Sohel Shaik',
      role: 'STUDENT',
      branch: 'CSE',
      campus: 'RK Valley',
      year: 'E3',
      section: 'CSE-02',
      points: 850,
      level: 'Advanced',
      mfa_enabled: 0,
      is_active: 1,
      joined_community: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 9,
      college_id: 'N210100',
      email: 'n210100@rguktnuz.ac.in',
      password: '$2a$10$.xaJw2ZIpARvu5rADOkzpeXiTgrqoSeUdTRt8bYhzEQR0/X2hQ/R6',
      name: 'Priya Sharma',
      role: 'STUDENT',
      branch: 'ECE',
      campus: 'Nuzvid',
      year: 'E4',
      section: 'ECE-01',
      points: 520,
      level: 'Advanced',
      mfa_enabled: 0,
      is_active: 1,
      joined_community: 1,
      created_at: new Date(),
      updated_at: new Date(),
    }
  ];

  const memoryCirculars = [
    {
      id: 1,
      circular_number: 'RGUKT/2026/0001',
      author_id: 1,
      author_role: 'DIRECTOR',
      title: 'Commencement of Academic Year 2026-27 & Registration Guidelines',
      content: 'All students and faculty across RK Valley, Nuzvid, Srikakulam, and Ongole campuses are hereby informed that the academic year 2026-27 will commence on July 1st, 2026. Online registration portals are open.',
      category: 'ACADEMIC',
      priority: 'HIGH',
      status: 'PUBLISHED',
      publish_date: new Date(),
      is_active: 1,
      author_name: 'Prof. K. Venkata Ramana',
      author_role: 'DIRECTOR',
      created_at: new Date(),
    },
    {
      id: 2,
      circular_number: 'RGUKT/2026/0002',
      author_id: 3,
      author_role: 'DEAN',
      title: 'End Semester Examination Schedule - Monsoon Semester',
      content: 'The final examination timetable for Engineering batches E1 through E4 has been officially released. Hall tickets will be downloadable via CircuLink.',
      category: 'EXAM',
      priority: 'URGENT',
      status: 'PUBLISHED',
      publish_date: new Date(),
      is_active: 1,
      author_name: 'Dr. S. Chandra Sekhar',
      author_role: 'DEAN',
      created_at: new Date(),
    }
  ];

  const memoryPosts = [
    {
      id: 1,
      author_id: 8,
      title: 'CircuLink Innovation Platform — RGUKT Ecosystem',
      content: 'Welcome to CircuLink! Connecting students and faculty across all RGUKT campuses.',
      type: 'PROJECT',
      branch: 'CSE',
      campus: 'RK Valley',
      visibility: 'ALL',
      likes_count: 42,
      endorsements_count: 12,
      status: 'PUBLISHED',
      is_featured: 1,
      author_name: 'Sohel Shaik',
      author_role: 'STUDENT',
      created_at: new Date(),
    }
  ];

  pool = {
    async query(sql, params = []) {
      const q = sql.trim();
      const upper = q.toUpperCase();

      if (upper.startsWith('SELECT 1')) {
        return [[{ ok: 1 }], []];
      }

      if (upper.includes('SHOW TABLES')) {
        return [[{ Tables_in_circulink: 'users' }], []];
      }

      if (upper.includes('FROM USERS')) {
        if (upper.includes('WHERE EMAIL = ? LIMIT 1')) {
          const email = String(params[0] || '').toLowerCase();
          const match = memoryUsers.find(u => u.email.toLowerCase() === email);
          return [match ? [match] : [], []];
        }
        if (upper.includes('WHERE COLLEGE_ID = ? OR EMAIL = ? LIMIT 1') || upper.includes('WHERE (COLLEGE_ID = ? OR EMAIL = ?)')) {
          const cId = String(params[0] || '').toUpperCase();
          const email = String(params[1] || '').toLowerCase();
          const match = memoryUsers.find(u => (u.college_id && u.college_id.toUpperCase() === cId) || u.email.toLowerCase() === email);
          return [match ? [match] : [], []];
        }
        if (upper.includes('WHERE ID = ? LIMIT 1')) {
          const id = Number(params[0]);
          const match = memoryUsers.find(u => u.id === id);
          return [match ? [match] : [], []];
        }
        if (upper.includes('COUNT(*)')) {
          return [[{ total: memoryUsers.length }], []];
        }
        return [memoryUsers, []];
      }

      if (upper.includes('FROM USER_BADGES')) {
        return [[{ badge_name: 'Innovator' }, { badge_name: 'Top Contributor' }], []];
      }

      if (upper.includes('FROM CIRCULARS')) {
        if (upper.includes('COUNT(*)')) {
          return [[{ total: memoryCirculars.length }], []];
        }
        return [memoryCirculars, []];
      }

      if (upper.includes('FROM POSTS')) {
        if (upper.includes('COUNT(*)')) {
          return [[{ total: memoryPosts.length }], []];
        }
        return [memoryPosts, []];
      }

      if (upper.startsWith('INSERT INTO USERS')) {
        const [college_id, email, password, name, role, campus, branch, year, section, profile_picture] = params;
        const newId = memoryUsers.length + 10;
        const newUser = {
          id: newId,
          college_id: college_id || `STU${newId}`,
          email: String(email).toLowerCase(),
          password,
          name: name || 'Student',
          role: role || 'STUDENT',
          campus: campus || 'RK Valley',
          branch: branch || 'CSE',
          year: year || 'E1',
          section: section || '01',
          profile_picture: profile_picture || '',
          points: 100,
          level: 'Beginner',
          is_active: 1,
          joined_community: 1,
          created_at: new Date(),
          updated_at: new Date(),
        };
        memoryUsers.push(newUser);
        return [{ insertId: newId, affectedRows: 1 }, []];
      }

      if (upper.startsWith('UPDATE USERS')) {
        const id = Number(params[params.length - 1]);
        const user = memoryUsers.find(u => u.id === id);
        if (user) {
          user.last_login = new Date();
          user.is_online = 1;
        }
        return [{ affectedRows: 1 }, []];
      }

      // Default safe response for other INSERT, UPDATE, DELETE, or SELECT
      if (upper.startsWith('SELECT')) {
        return [[], []];
      }
      return [{ affectedRows: 1, insertId: 1 }, []];
    },
    async getConnection() {
      return {
        query: this.query.bind(this),
        release() {},
      };
    },
    end() {},
  };
} else {
  const poolConfig = process.env.DATABASE_URL
    ? {
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'circulink',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        waitForConnections: true,
        connectionLimit: 20,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      };

  pool = mysql.createPool(poolConfig);

  // Test connection on boot (non-blocking, local/server only)
  if (!process.env.VERCEL) {
    pool.getConnection()
      .then((conn) => {
        console.log('⚡ MySQL 8 Connection Pool initialized successfully');
        conn.release();
      })
      .catch((err) => {
        console.error('❌ MySQL Connection Pool Error:', err.message);
      });
  }
}

module.exports = pool;
