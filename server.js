const express = require('express');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;
const SECRET_KEY = 'your-secret-key-change-this-in-production';

// 连接数据库
const db = new sqlite3.Database(path.join(__dirname, 'data', 'passwords.db'), (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

// 文件系统模块
const fs = require('fs');

// 初始化数据库表
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#667eea',
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 尝试添加 sortOrder 字段（忽略错误，因为可能已存在）
  db.run(`ALTER TABLE categories ADD COLUMN sortOrder INTEGER DEFAULT 0`, (err) => {
    if (err && err.message.includes("duplicate column name")) {
      // 字段已存在，忽略错误
    } else if (err) {
      console.log('添加 sortOrder 字段时出错:', err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS passwords (
      id TEXT PRIMARY KEY,
      title TEXT,
      username TEXT,
      password TEXT,
      url TEXT,
      categoryId TEXT,
      note TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    )
  `);

  // 备份日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      fileSize INTEGER,
      backupTime TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'success',
      message TEXT
    )
  `);

  // 设置表
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 插入默认分类（如果不存在）
  const defaultCategories = [
    { id: 'social', name: '社交', icon: '💬', color: '#11998e' },
    { id: 'work', name: '工作', icon: '💼', color: '#4facfe' },
    { id: 'finance', name: '金融', icon: '💰', color: '#fa709a' },
    { id: 'shopping', name: '购物', icon: '🛒', color: '#a8edea' },
    { id: 'entertainment', name: '娱乐', icon: '🎮', color: '#ff9a9e' },
    { id: 'other', name: '其他', icon: '📦', color: '#667eea' }
  ];

  defaultCategories.forEach(cat => {
    db.get('SELECT id FROM categories WHERE id = ?', [cat.id], (err, row) => {
      if (!row) {
        db.run(
          'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, cat.icon, cat.color]
        );
      }
    });
  });

  // 插入默认设置（如果不存在）
  db.get('SELECT id FROM settings WHERE key = "backupInterval"', (err, row) => {
    if (!row) {
      db.run('INSERT INTO settings (id, key, value, description) VALUES (?, ?, ?, ?)', [
        uuidv4(),
        'backupInterval',
        '24',
        '备份间隔（小时）'
      ]);
    }
  });

  db.get('SELECT id FROM settings WHERE key = "lastBackupTime"', (err, row) => {
    if (!row) {
      db.run('INSERT INTO settings (id, key, value, description) VALUES (?, ?, ?, ?)', [
        uuidv4(),
        'lastBackupTime',
        '',
        '上次备份时间'
      ]);
    }
  });
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 设置全局字符编码
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

// 处理 favicon.ico 请求（避免 404）
app.get('/favicon.ico', (req, res) => {
  res.status(204).send();
});

// ==================== 备份功能 ====================

// 执行备份
function performBackup(callback) {
  const backupDir = path.join(__dirname, 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `passwords_${timestamp}.db`;
  const backupFilePath = path.join(backupDir, backupFileName);
  const sourceFilePath = path.join(__dirname, 'data', 'passwords.db');

  // 确保备份目录存在
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // 复制数据库文件
    fs.copyFileSync(sourceFilePath, backupFilePath);
    const fileSize = fs.statSync(backupFilePath).size;

    // 记录备份日志
    const backupRecord = {
      id: uuidv4(),
      fileName: backupFileName,
      filePath: backupFilePath,
      fileSize: fileSize,
      backupTime: new Date().toISOString(),
      status: 'success',
      message: '备份成功'
    };

    db.run(
      'INSERT INTO backups (id, fileName, filePath, fileSize, backupTime, status, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [backupRecord.id, backupRecord.fileName, backupRecord.filePath, backupRecord.fileSize, backupRecord.backupTime, backupRecord.status, backupRecord.message],
      (err) => {
        if (err) {
          console.error('备份日志记录失败:', err.message);
        }
        // 更新最后备份时间
        db.run('UPDATE settings SET value = ?, updatedAt = ? WHERE key = "lastBackupTime"', [new Date().toISOString(), new Date().toISOString()]);
      }
    );

    callback(null, backupRecord);
  } catch (err) {
    const errorRecord = {
      id: uuidv4(),
      fileName: backupFileName,
      filePath: backupFilePath,
      fileSize: 0,
      backupTime: new Date().toISOString(),
      status: 'error',
      message: err.message
    };

    db.run(
      'INSERT INTO backups (id, fileName, filePath, fileSize, backupTime, status, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [errorRecord.id, errorRecord.fileName, errorRecord.filePath, errorRecord.fileSize, errorRecord.backupTime, errorRecord.status, errorRecord.message],
      () => {}
    );

    callback(err, errorRecord);
  }
}

// 检查是否需要备份
function checkAndBackup() {
  db.get('SELECT value FROM settings WHERE key = "backupInterval"', (err, intervalRow) => {
    if (err || !intervalRow) return;

    const intervalHours = parseInt(intervalRow.value) || 24;

    db.get('SELECT value FROM settings WHERE key = "lastBackupTime"', (err, timeRow) => {
      if (err) return;

      const lastBackupTime = timeRow?.value ? new Date(timeRow.value) : null;
      const now = new Date();

      // 如果从未备份过，或者超过备份间隔时间
      if (!lastBackupTime || (now - lastBackupTime) > (intervalHours * 60 * 60 * 1000)) {
        console.log(`自动备份: 上次备份时间 ${lastBackupTime || '从未'}，现在执行备份...`);
        performBackup((err, record) => {
          if (err) {
            console.error('自动备份失败:', err.message);
          } else {
            console.log('自动备份成功:', record.fileName);
          }
        });
      }
    });
  });
}

// 定时检查备份（每小时检查一次）
setInterval(checkAndBackup, 60 * 60 * 1000);

// 服务启动时检查一次备份
setTimeout(checkAndBackup, 5000);

// ==================== 备份API ====================

// 创建备份
app.post('/api/backups', (req, res) => {
  performBackup((err, record) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(record);
  });
});

// 获取备份列表
app.get('/api/backups', (req, res) => {
  db.all('SELECT * FROM backups ORDER BY backupTime DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取备份详情（读取备份文件中的数据）
app.get('/api/backups/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM backups WHERE id = ?', [id], (err, backup) => {
    if (err || !backup) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: '备份文件已删除' });
    }

    // 打开备份文件读取数据
    const backupDb = new sqlite3.Database(backup.filePath, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      backupDb.all(`
        SELECT p.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
        FROM passwords p
        LEFT JOIN categories c ON p.categoryId = c.id
        ORDER BY p.createdAt DESC
      `, (err, rows) => {
        backupDb.close();
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        const decryptedRows = rows.map(row => ({
          ...row,
          password: decrypt(row.password)
        }));
        res.json({ backup, data: decryptedRows });
      });
    });
  });
});

// 删除备份
app.delete('/api/backups/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM backups WHERE id = ?', [id], (err, backup) => {
    if (err || !backup) {
      return res.status(404).json({ error: '备份不存在' });
    }

    // 删除文件
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    // 删除数据库记录
    db.run('DELETE FROM backups WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: '删除成功' });
    });
  });
});

// 从备份恢复
app.post('/api/backups/:id/restore', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM backups WHERE id = ?', [id], (err, backup) => {
    if (err || !backup) {
      return res.status(404).json({ error: '备份不存在' });
    }

    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: '备份文件已删除' });
    }

    const sourceFilePath = backup.filePath;
    const destFilePath = path.join(__dirname, 'data', 'passwords.db');

    try {
      // 先创建当前数据库的备份
      const tempBackupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(tempBackupDir)) {
        fs.mkdirSync(tempBackupDir, { recursive: true });
      }
      const tempBackupName = `restore_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      if (fs.existsSync(destFilePath)) {
        fs.copyFileSync(destFilePath, path.join(tempBackupDir, tempBackupName));
      }

      // 恢复备份
      fs.copyFileSync(sourceFilePath, destFilePath);

      // 记录恢复操作
      db.run('UPDATE settings SET value = ?, updatedAt = ? WHERE key = "lastBackupTime"', [new Date().toISOString(), new Date().toISOString()]);

      res.json({ message: '恢复成功' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ==================== 设置API ====================

// 获取设置
app.get('/api/settings', (req, res) => {
  db.all('SELECT * FROM settings', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  });
});

// 更新设置
app.put('/api/settings', (req, res) => {
  const { key, value } = req.body;

  db.run('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?', [value, new Date().toISOString(), key], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '设置更新成功' });
  });
});

// ==================== Emoji API ====================

// 获取 emoji 列表
app.get('/api/emojis', (req, res) => {
  const emojis = {
    categories: [
      { name: '常用', emojis: ['📦', '📁', '📂', '📄', '📋', '📌', '📍', '🏷️', '📎', '🔖'] },
      { name: '社交', emojis: ['💬', '💭', '💻', '📱', '📞', '📧', '✉️', '💌', '📩', '📨'] },
      { name: '工作', emojis: ['💼', '📊', '📈', '📉', '📋', '📝', '✏️', '📎', '🖇️', '📁'] },
      { name: '金融', emojis: ['💰', '💳', '💵', '💴', '💷', '📊', '📈', '🏦', '💸', '🤑'] },
      { name: '购物', emojis: ['🛒', '🛍️', '🏪', '🏬', '💳', '💰', '🛎️', '🎁', '🎀', '💝'] },
      { name: '娱乐', emojis: ['🎮', '🎯', '🎲', '🎪', '🎭', '🎬', '🎨', '🎵', '🎶', '🎸'] },
      { name: '生活', emojis: ['🏠', '🚗', '✈️', '🚀', '🎒', '👝', '💼', '📱', '💻', '⌚'] },
      { name: '符号', emojis: ['⭐', '🌟', '✨', '💫', '⚡', '🔥', '💯', '✅', '🔒', '🔑'] },
      { name: '动物', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'] },
      { name: '植物', emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '🍀', '🌿', '🌱', '🌳', '🌲'] }
    ]
  };

  res.json(emojis);
});

// 获取随机 emoji
app.get('/api/emojis/random', (req, res) => {
  const allEmojis = [
    '📦', '📁', '📂', '📄', '📋', '📌', '📍', '🏷️', '📎', '🔖',
    '💬', '💭', '💻', '📱', '📞', '📧', '✉️', '💌', '📩', '📨',
    '💼', '📊', '📈', '📉', '📝', '✏️', '🖇️',
    '💰', '💳', '💵', '💴', '💷', '🏦', '💸', '🤑',
    '🛒', '🛍️', '🏪', '🏬', '🛎️', '🎁', '🎀',
    '🎮', '🎯', '🎲', '🎪', '🎭', '🎬', '🎨', '🎵', '🎶',
    '🏠', '🚗', '✈️', '🚀', '🎒', '👝', '⌚',
    '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💯', '✅', '🔒', '🔑',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🌸', '🌺', '🌻', '🌹', '🌷', '🍀', '🌿', '🌱'
  ];

  const randomEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
  res.json({ emoji: randomEmoji });
});

// 加密函数
function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

// 解密函数
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ==================== 分类API ====================

// 获取所有分类
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY sortOrder ASC, createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 添加分类
app.post('/api/categories', (req, res) => {
  const { name, icon, color } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }

  // 获取当前最大的 sortOrder 值
  db.get('SELECT COALESCE(MAX(sortOrder), 0) as maxOrder FROM categories', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const newSortOrder = (row.maxOrder || 0) + 1;
    const id = uuidv4();
    const newCategory = {
      id,
      name,
      icon: icon || '📦',
      color: color || '#667eea',
      sortOrder: newSortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.run(
      'INSERT INTO categories (id, name, icon, color, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newCategory.id, newCategory.name, newCategory.icon, newCategory.color, newCategory.sortOrder, newCategory.createdAt, newCategory.updatedAt],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(newCategory);
      }
    );
  });
});

// 更新分类排序
app.put('/api/categories/sort', (req, res) => {
  const orderList = req.body;

  // 开启事务
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    let completed = 0;
    let hasError = false;
    let errorMessage = '';

    orderList.forEach(item => {
      db.run('UPDATE categories SET sortOrder = ?, updatedAt = ? WHERE id = ?',
        [item.sortOrder, new Date().toISOString(), item.id],
        (err) => {
          if (err) {
            hasError = true;
            errorMessage = err.message;
            db.run('ROLLBACK');
          }

          completed++;
          if (completed === orderList.length) {
            if (!hasError) {
              db.run('COMMIT', (err) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                res.json({ message: '排序更新成功' });
              });
            } else {
              res.status(500).json({ error: errorMessage });
            }
          }
        }
      );
    });
  });
});

// 更新分类
app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, icon, color } = req.body;

  db.run(
    'UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color), updatedAt = ? WHERE id = ?',
    [name, icon, color, new Date().toISOString(), id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        res.json(row);
      });
    }
  );
});

// 删除分类
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;

  // 将该分类下的密码移到默认分类
  db.run('UPDATE passwords SET categoryId = "other" WHERE categoryId = ?', [id]);

  db.run('DELETE FROM categories WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '删除成功' });
  });
});

// ==================== 密码API ====================

// 获取所有密码
app.get('/api/passwords', (req, res) => {
  db.all(`
    SELECT p.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
    FROM passwords p
    LEFT JOIN categories c ON p.categoryId = c.id
    ORDER BY p.createdAt DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const decryptedRows = rows.map(row => ({
      ...row,
      password: decrypt(row.password)
    }));
    res.json(decryptedRows);
  });
});

// 搜索密码
app.get('/api/passwords/search', (req, res) => {
  const { keyword, categoryId } = req.query;
  
  let query = `
    SELECT p.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor
    FROM passwords p
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE 1=1
  `;
  
  const params = [];

  if (keyword) {
    query += ` AND (p.title LIKE ? OR p.username LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword);
  }

  if (categoryId && categoryId !== 'all') {
    query += ` AND p.categoryId = ?`;
    params.push(categoryId);
  }

  query += ' ORDER BY p.createdAt DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const decryptedRows = rows.map(row => ({
      ...row,
      password: decrypt(row.password)
    }));
    res.json(decryptedRows);
  });
});

// 添加密码
app.post('/api/passwords', (req, res) => {
  const { title, username, password, url, categoryId, note } = req.body;

  const id = uuidv4();
  const newPassword = {
    id,
    title: title || '',
    username: username || '',
    password: encrypt(password || ''),
    url: url || '',
    categoryId: categoryId || 'other',
    note: note || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.run(
    'INSERT INTO passwords (id, title, username, password, url, categoryId, note, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newPassword.id, newPassword.title, newPassword.username, newPassword.password, newPassword.url, newPassword.categoryId, newPassword.note, newPassword.createdAt, newPassword.updatedAt],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ ...newPassword, password: password || '' });
    }
  );
});

// 更新密码
app.put('/api/passwords/:id', (req, res) => {
  const { id } = req.params;
  const { title, username, password, url, categoryId, note } = req.body;

  db.get('SELECT password FROM passwords WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const existingPassword = row ? decrypt(row.password) : '';
    const newPassword = password !== undefined ? encrypt(password) : row.password;

    db.run(
      'UPDATE passwords SET title = COALESCE(?, title), username = COALESCE(?, username), password = ?, url = COALESCE(?, url), categoryId = COALESCE(?, categoryId), note = COALESCE(?, note), updatedAt = ? WHERE id = ?',
      [title, username, newPassword, url, categoryId, note, new Date().toISOString(), id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ 
          ...req.body, 
          id,
          password: password !== undefined ? password : existingPassword 
        });
      }
    );
  });
});

// 删除密码
app.delete('/api/passwords/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM passwords WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '删除成功' });
  });
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`密码管理器服务已启动: http://localhost:${PORT}`);
});
