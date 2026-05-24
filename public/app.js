// API 基础地址
const API_BASE = '/api';

// 当前数据
let passwords = [];
let categories = [];

// 初始化
async function init() {
  await loadCategories();
  await loadPasswords();
  setupEventListeners();
}

// 加载分类
async function loadCategories() {
  console.log('开始加载分类...');
  try {
    console.log('发起请求:', `${API_BASE}/categories`);
    const response = await fetch(`${API_BASE}/categories`);
    console.log('响应状态:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    categories = await response.json();
    console.log('分类数据:', categories);
    
    // 按排序字段排序
    categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    console.log('开始渲染分类选项...');
    renderCategoryOptions();
    
    console.log('开始渲染分类筛选选项...');
    renderCategoryFilterOptions();
    
    console.log('开始渲染分类标签...');
    renderCategoryTags();
    
    console.log('开始渲染分类列表...');
    renderCategoryList();
    
    console.log('开始渲染侧边栏分类...');
    renderSidebarCategories();
    
    console.log('分类加载完成!');
  } catch (error) {
    console.error('加载分类失败:', error);
    console.error('错误详情:', error.stack);
    showToast('加载分类失败', 'error');
  }
}

// 加载密码列表
async function loadPasswords() {
  try {
    const response = await fetch(`${API_BASE}/passwords`);
    passwords = await response.json();
    renderPasswordList();
    updateCount();
    // 更新侧边栏分类计数
    renderSidebarCategories();
  } catch (error) {
    showToast('加载数据失败', 'error');
  }
}

// 更新计数
function updateCount() {
  document.getElementById('passwordCount').textContent = passwords.length;
}

// 渲染分类选项（添加账号弹窗）
function renderCategoryOptions() {
  const select = document.getElementById('category');
  select.innerHTML = categories.map(c => 
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');
}

// 渲染分类筛选下拉框
function renderCategoryFilterOptions() {
  const select = document.getElementById('categoryFilter');
  select.innerHTML = '<option value="all">全部分类</option>' +
    categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

// 渲染分类标签
function renderCategoryTags() {
  const container = document.getElementById('categoryTags');
  container.innerHTML = '<span class="tag active" data-category="all">全部</span>' +
    categories.map(c => `<span class="tag" data-category="${c.id}">${c.icon} ${c.name}</span>`).join('');
  
  // 重新绑定点击事件
  container.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', function() {
      container.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('categoryFilter').value = this.dataset.category;
      handleSearch();
    });
  });
}

// 渲染分类列表（管理弹窗）
function renderCategoryList() {
  const container = document.getElementById('categoryList');
  
  if (categories.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">暂无分类</p>';
    return;
  }
  
  container.innerHTML = categories.map(c => `
    <div class="category-item">
      <div class="cat-info">
        <div class="cat-icon" style="background: linear-gradient(135deg, ${c.color}40, ${c.color}80);">${c.icon}</div>
        <span class="cat-name">${escapeHtml(c.name)}</span>
      </div>
      <div class="cat-actions">
        <button class="btn btn-small btn-secondary" onclick="editCategory('${c.id}')">编辑</button>
        ${c.id !== 'other' ? `<button class="btn btn-small btn-danger" onclick="deleteCategory('${c.id}')">删除</button>` : ''}
      </div>
    </div>
  `).join('');
}

// 渲染密码列表
function renderPasswordList(data = passwords) {
  const container = document.getElementById('passwordList');
  const emptyState = document.getElementById('emptyState');
  
  if (data.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  container.innerHTML = data.map(item => {
    const catColor = item.categoryColor || '#667eea';
    const catIcon = item.categoryIcon || '📦';
    const catName = item.categoryName || '其他';
    const encUsername = btoa(unescape(encodeURIComponent(item.username || '')));
    const encPassword = btoa(unescape(encodeURIComponent(item.password || '')));
    const encUrl = btoa(unescape(encodeURIComponent(item.url || '')));
    const encNote = btoa(unescape(encodeURIComponent(item.note || '')));
    
    return `
      <div class="password-card" data-id="${item.id}">
        <div class="card-header">
          <div class="card-title">
            <div class="card-icon" style="background: linear-gradient(135deg, ${catColor}40, ${catColor}80);">${catIcon}</div>
            <div class="card-info">
              <h3>${escapeHtml(item.title || '未命名')}</h3>
              <span class="category-name">${catName}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn btn-small btn-secondary" onclick="editPassword('${item.id}')">编辑</button>
            <button class="btn btn-small btn-danger" onclick="deletePassword('${item.id}')">删除</button>
          </div>
        </div>
        <div class="card-body">
          ${item.username ? `
          <div class="info-row">
            <span class="info-label">账号</span>
            <div class="info-value">
              <span class="text">${escapeHtml(item.username)}</span>
              <button class="copy-btn" onclick="copyField('${encUsername}')">复制</button>
            </div>
          </div>
          ` : ''}
          ${item.password ? `
          <div class="info-row">
            <span class="info-label">密码</span>
            <div class="info-value">
              <span class="text password-text" id="pwd-${item.id}">••••••••</span>
              <button class="reveal-btn" onclick="toggleReveal('${item.id}', '${encPassword}')">显示</button>
              <button class="copy-btn" onclick="copyField('${encPassword}')">复制</button>
            </div>
          </div>
          ` : ''}
          ${item.url ? `
          <div class="info-row">
            <span class="info-label">网址</span>
            <div class="info-value">
              <span class="text">${escapeHtml(item.url)}</span>
              <button class="copy-btn" onclick="copyField('${encUrl}')">复制</button>
            </div>
          </div>
          ` : ''}
        </div>
        ${item.note ? `<div class="card-note">${escapeHtml(item.note)}</div>` : ''}
        <div class="card-footer">
          ${(item.username && item.password) ? `<button class="btn btn-small btn-copy-all" onclick="copyAccountAndPassword('${encUsername}', '${encPassword}')">📋 一键复制账号密码</button>` : ''}
          <button class="btn btn-small btn-copy-all-info" onclick="copyAllInfo('${encUsername}', '${encPassword}', '${encUrl}', '${encNote}')">📄 一键复制全部信息</button>
        </div>
      </div>
    `;
  }).join('');
}

// 搜索处理
async function handleSearch() {
  const keyword = document.getElementById('searchInput').value;
  const categoryId = document.getElementById('categoryFilter').value;
  
  try {
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (categoryId && categoryId !== 'all') params.append('categoryId', categoryId);
    
    const response = await fetch(`${API_BASE}/passwords/search?${params}`);
    const data = await response.json();
    renderPasswordList(data);
  } catch (error) {
    showToast('搜索失败', 'error');
  }
}

// ==================== 密码操作 ====================

function openModal(id = null) {
  const modal = document.getElementById('modal');
  const form = document.getElementById('passwordForm');
  const title = document.getElementById('modalTitle');
  
  form.reset();
  document.getElementById('editId').value = '';
  
  if (id) {
    const item = passwords.find(p => p.id === id);
    if (item) {
      title.textContent = '编辑账号';
      document.getElementById('editId').value = item.id;
      document.getElementById('title').value = item.title || '';
      document.getElementById('username').value = item.username || '';
      document.getElementById('password').value = item.password || '';
      document.getElementById('category').value = item.categoryId || 'other';
      document.getElementById('url').value = item.url || '';
      document.getElementById('note').value = item.note || '';
    }
  } else {
    title.textContent = '添加账号';
  }
  
  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

async function handleSubmit(event) {
  event.preventDefault();
  
  const id = document.getElementById('editId').value;
  const data = {
    title: document.getElementById('title').value,
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    categoryId: document.getElementById('category').value,
    url: document.getElementById('url').value,
    note: document.getElementById('note').value
  };
  
  try {
    const url = id ? `${API_BASE}/passwords/${id}` : `${API_BASE}/passwords`;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showToast(id ? '修改成功' : '添加成功');
      closeModal();
      await loadPasswords();
    } else {
      const error = await response.json();
      showToast(error.error || '操作失败', 'error');
    }
  } catch (error) {
    showToast('网络错误', 'error');
  }
}

function editPassword(id) {
  openModal(id);
}

async function deletePassword(id) {
  if (!confirm('确定要删除这个账号吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/passwords/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showToast('删除成功');
      await loadPasswords();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (error) {
    showToast('网络错误', 'error');
  }
}

// ==================== 分类操作 ====================

function openCategoryModal() {
  document.getElementById('categoryModal').classList.add('show');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('show');
}

function addCategory() {
  const modal = document.getElementById('editCategoryModal');
  const title = document.getElementById('categoryModalTitle');
  
  title.textContent = '添加分类';
  document.getElementById('categoryEditId').value = '';
  document.getElementById('categoryName').value = '';
  document.getElementById('categoryIcon').value = '📦';
  document.getElementById('categoryColor').value = '#667eea';
  
  modal.classList.add('show');
}

function editCategory(id) {
  const modal = document.getElementById('editCategoryModal');
  const title = document.getElementById('categoryModalTitle');
  const category = categories.find(c => c.id === id);
  
  if (category) {
    title.textContent = '编辑分类';
    document.getElementById('categoryEditId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryIcon').value = category.icon;
    document.getElementById('categoryColor').value = category.color;
  }
  
  modal.classList.add('show');
}

function closeEditCategoryModal() {
  document.getElementById('editCategoryModal').classList.remove('show');
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  
  const id = document.getElementById('categoryEditId').value;
  const data = {
    name: document.getElementById('categoryName').value,
    icon: document.getElementById('categoryIcon').value,
    color: document.getElementById('categoryColor').value
  };
  
  if (!data.name.trim()) {
    showToast('分类名称不能为空', 'error');
    return;
  }
  
  try {
    const url = id ? `${API_BASE}/categories/${id}` : `${API_BASE}/categories`;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showToast(id ? '分类修改成功' : '分类添加成功');
      closeEditCategoryModal();
      closeCategoryModal();
      await loadCategories();
      await loadPasswords();
    } else {
      const error = await response.json();
      showToast(error.error || '操作失败', 'error');
    }
  } catch (error) {
    showToast('网络错误', 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('确定要删除这个分类吗？该分类下的账号将移到"其他"分类。')) return;
  
  try {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showToast('删除成功');
      await loadCategories();
      await loadPasswords();
    } else {
      showToast('删除失败', 'error');
    }
  } catch (error) {
    showToast('网络错误', 'error');
  }
}

// ==================== 辅助函数 ====================

function decodeField(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (e) {
    return atob(encoded);
  }
}

function toggleReveal(id, encPassword) {
  const element = document.getElementById(`pwd-${id}`);
  const btn = element.nextElementSibling;
  
  if (element.classList.contains('revealed')) {
    element.textContent = '••••••••';
    element.classList.remove('revealed');
    btn.textContent = '显示';
  } else {
    element.textContent = decodeField(encPassword);
    element.classList.add('revealed');
    btn.textContent = '隐藏';
  }
}

function togglePassword() {
  const input = document.getElementById('password');
  const btn = input.nextElementSibling;
  
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板');
  }
}

function copyField(encoded) {
  copyToClipboard(decodeField(encoded));
}

async function copyAccountAndPassword(encUsername, encPassword) {
  const username = decodeField(encUsername);
  const password = decodeField(encPassword);
  const text = `账号: ${username}\n密码: ${password}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制账号和密码');
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制账号和密码');
  }
}

async function copyAllInfo(encUsername, encPassword, encUrl, encNote) {
  const username = decodeField(encUsername);
  const password = decodeField(encPassword);
  const url = decodeField(encUrl);
  const note = decodeField(encNote);
  const lines = [];
  if (username) lines.push(`账号: ${username}`);
  if (password) lines.push(`密码: ${password}`);
  if (url) lines.push(`网址: ${url}`);
  if (note) lines.push(`备注: ${note}`);
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制全部信息');
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制全部信息');
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#ff4757' : '#333';
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 备份管理 ====================

let backups = [];
let currentBackupId = null;

// 打开备份管理弹窗
function openBackupModal() {
  document.getElementById('backupModal').classList.add('show');
  loadBackups();
  loadSettings();
}

// 关闭备份管理弹窗
function closeBackupModal() {
  document.getElementById('backupModal').classList.remove('show');
}

// 加载备份列表
async function loadBackups() {
  try {
    const response = await fetch(`${API_BASE}/backups`);
    backups = await response.json();
    renderBackupList();
    document.getElementById('backupCount').textContent = backups.length;
  } catch (error) {
    showToast('加载备份失败', 'error');
  }
}

// 渲染备份列表
function renderBackupList() {
  const container = document.getElementById('backupList');
  
  if (backups.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">暂无备份</p>';
    return;
  }
  
  container.innerHTML = backups.map(b => `
    <div class="backup-item" onclick="openBackupDetail('${b.id}')">
      <div class="backup-info">
        <div class="backup-name">${b.fileName}</div>
        <div class="backup-meta">
          <span>${formatDate(b.backupTime)}</span>
          <span>${formatFileSize(b.fileSize)}</span>
          <span class="status ${b.status}">${b.status === 'success' ? '✅ 成功' : '❌ 失败'}</span>
        </div>
      </div>
      <div class="backup-actions">
        <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); openBackupDetail('${b.id}')">查看</button>
        <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); deleteBackup('${b.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

// 打开备份详情
async function openBackupDetail(id) {
  currentBackupId = id;
  const backup = backups.find(b => b.id === id);
  
  try {
    const response = await fetch(`${API_BASE}/backups/${id}`);
    const data = await response.json();
    
    document.getElementById('backupInfo').innerHTML = `
      <div class="backup-detail-info">
        <p><strong>文件名:</strong> ${data.backup.fileName}</p>
        <p><strong>备份时间:</strong> ${formatDate(data.backup.backupTime)}</p>
        <p><strong>文件大小:</strong> ${formatFileSize(data.backup.fileSize)}</p>
        <p><strong>状态:</strong> <span class="status ${data.backup.status}">${data.backup.status === 'success' ? '✅ 成功' : '❌ 失败'}</span></p>
      </div>
    `;
    
    renderBackupPasswordList(data.data);
    document.getElementById('backupDetailModal').classList.add('show');
  } catch (error) {
    showToast('加载备份详情失败', 'error');
  }
}

// 渲染备份密码列表
function renderBackupPasswordList(data) {
  const container = document.getElementById('backupPasswordList');
  
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">备份中没有密码数据</p>';
    return;
  }
  
  container.innerHTML = data.map(item => {
    const catColor = item.categoryColor || '#667eea';
    const catIcon = item.categoryIcon || '📦';
    
    return `
      <div class="password-card">
        <div class="card-header">
          <div class="card-title">
            <div class="card-icon" style="background: linear-gradient(135deg, ${catColor}40, ${catColor}80);">${catIcon}</div>
            <div class="card-info">
              <h3>${item.title || '未命名'}</h3>
              <span class="category-name">${item.categoryName || '其他'}</span>
            </div>
          </div>
        </div>
        <div class="card-body">
          ${item.username ? `
          <div class="info-row">
            <span class="info-label">账号</span>
            <div class="info-value">
              <span class="text">${escapeHtml(item.username)}</span>
              <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(item.username)}')">复制</button>
            </div>
          </div>
          ` : ''}
          ${item.password ? `
          <div class="info-row">
            <span class="info-label">密码</span>
            <div class="info-value">
              <span class="text password-text" id="backup-pwd-${item.id}">••••••••</span>
              <button class="reveal-btn" onclick="toggleReveal('backup-pwd-${item.id}', '${escapeHtml(item.password)}')">显示</button>
              <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(item.password)}')">复制</button>
            </div>
          </div>
          ` : ''}
          ${item.url ? `
          <div class="info-row">
            <span class="info-label">网址</span>
            <div class="info-value">
              <span class="text">${escapeHtml(item.url)}</span>
              <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(item.url)}')">复制</button>
            </div>
          </div>
          ` : ''}
        </div>
        ${item.note ? `<div class="card-note">${escapeHtml(item.note)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// 关闭备份详情弹窗
function closeBackupDetailModal() {
  document.getElementById('backupDetailModal').classList.remove('show');
  currentBackupId = null;
}

// 创建备份
async function createBackup() {
  try {
    const response = await fetch(`${API_BASE}/backups`, { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      showToast('备份成功');
      await loadBackups();
    } else {
      showToast(data.error || '备份失败', 'error');
    }
  } catch (error) {
    showToast('备份失败', 'error');
  }
}

// 删除备份
async function deleteBackup(id) {
  if (!confirm('确定要删除这个备份吗？此操作不可恢复。')) return;
  
  try {
    const response = await fetch(`${API_BASE}/backups/${id}`, { method: 'DELETE' });
    
    if (response.ok) {
      showToast('删除成功');
      await loadBackups();
      if (currentBackupId === id) {
        closeBackupDetailModal();
      }
    } else {
      showToast('删除失败', 'error');
    }
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

// 恢复备份
async function restoreBackup(id) {
  if (!confirm('确定要从备份恢复吗？当前数据将被覆盖！')) return;
  
  try {
    const response = await fetch(`${API_BASE}/backups/${id}/restore`, { method: 'POST' });
    
    if (response.ok) {
      showToast('恢复成功，请刷新页面');
      closeBackupDetailModal();
      closeBackupModal();
      await loadPasswords();
    } else {
      showToast('恢复失败', 'error');
    }
  } catch (error) {
    showToast('恢复失败', 'error');
  }
}

// ==================== 设置管理 ====================

let settings = {};

// 打开设置弹窗
function openSettingsModal() {
  document.getElementById('settingsModal').classList.add('show');
  loadSettings();
}

// 关闭设置弹窗
function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('show');
}

// 加载设置
async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    settings = await response.json();
    
    // 设置备份间隔
    document.getElementById('backupIntervalSelect').value = settings.backupInterval || '24';
    document.getElementById('backupInterval').textContent = `${settings.backupInterval || 24} 小时`;
    
    // 设置上次备份时间
    document.getElementById('lastBackupTime').textContent = settings.lastBackupTime ? formatDate(settings.lastBackupTime) : '从未';
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 保存设置
async function saveSettings() {
  const backupInterval = document.getElementById('backupIntervalSelect').value;
  
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'backupInterval', value: backupInterval })
    });
    
    if (response.ok) {
      showToast('设置保存成功');
      settings.backupInterval = backupInterval;
      document.getElementById('backupInterval').textContent = `${backupInterval} 小时`;
    } else {
      showToast('保存失败', 'error');
    }
  } catch (error) {
    showToast('保存失败', 'error');
  }
}

// ==================== Emoji选择器 ====================

let emojis = [];

// 打开 emoji 选择器
async function openEmojiModal() {
  try {
    const response = await fetch(`${API_BASE}/emojis`);
    const data = await response.json();
    emojis = data.categories;
    renderEmojiCategories();
    document.getElementById('emojiModal').classList.add('show');
  } catch (error) {
    showToast('加载图标失败', 'error');
  }
}

// 关闭 emoji 选择器
function closeEmojiModal() {
  document.getElementById('emojiModal').classList.remove('show');
}

// 渲染 emoji 分类
function renderEmojiCategories() {
  const container = document.getElementById('emojiCategories');
  
  container.innerHTML = emojis.map(cat => `
    <div class="emoji-category">
      <h4>${cat.name}</h4>
      <div class="emoji-grid">
        ${cat.emojis.map(emoji => `
          <button class="emoji-btn" onclick="selectEmoji('${emoji}')">${emoji}</button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// 选择 emoji
function selectEmoji(emoji) {
  document.getElementById('categoryIcon').value = emoji;
  closeEmojiModal();
}

// 获取随机 emoji
async function getRandomEmoji() {
  try {
    const response = await fetch(`${API_BASE}/emojis/random`);
    const data = await response.json();
    document.getElementById('categoryIcon').value = data.emoji;
    closeEmojiModal();
  } catch (error) {
    showToast('获取随机图标失败', 'error');
  }
}

// ==================== 辅助函数 ====================

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== 事件监听 ====================

function setupEventListeners() {
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  
  document.getElementById('categoryModal').addEventListener('click', (e) => {
    if (e.target.id === 'categoryModal') closeCategoryModal();
  });
  
  document.getElementById('editCategoryModal').addEventListener('click', (e) => {
    if (e.target.id === 'editCategoryModal') closeEditCategoryModal();
  });
  
  document.getElementById('backupModal').addEventListener('click', (e) => {
    if (e.target.id === 'backupModal') closeBackupModal();
  });
  
  document.getElementById('backupDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'backupDetailModal') closeBackupDetailModal();
  });
  
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') closeSettingsModal();
  });
  
  document.getElementById('emojiModal').addEventListener('click', (e) => {
    if (e.target.id === 'emojiModal') closeEmojiModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeCategoryModal();
      closeEditCategoryModal();
      closeBackupModal();
      closeBackupDetailModal();
      closeSettingsModal();
      closeEmojiModal();
    }
  });
}

// 启动应用
// 渲染侧边栏分类列表
function renderSidebarCategories() {
  const container = document.getElementById('categorySidebarList');
  
  // 计算每个分类的密码数量
  const categoryCounts = {};
  passwords.forEach(p => {
    const catId = p.categoryId || 'other';
    categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
  });
  
  // 添加"全部"选项
  let html = `
    <div class="sidebar-category active" data-category="all">
      <span class="category-emoji">📋</span>
      <span class="category-name">全部</span>
      <span class="category-count">${passwords.length}</span>
    </div>
  `;
  
  // 添加分类选项
  html += categories.map(c => `
    <div class="sidebar-category" data-category="${c.id}">
      <span class="category-emoji">${c.icon}</span>
      <span class="category-name">${escapeHtml(c.name)}</span>
      <span class="category-count">${categoryCounts[c.id] || 0}</span>
    </div>
  `).join('');
  
  container.innerHTML = html;
  
  // 绑定点击事件
  container.querySelectorAll('.sidebar-category').forEach(item => {
    item.addEventListener('click', function() {
      container.querySelectorAll('.sidebar-category').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('categoryFilter').value = this.dataset.category;
      handleSearch();
    });
  });
}

// 打开/关闭侧边栏（切换）
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

// 打开侧边栏
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.add('open');
  overlay.classList.add('active');
}

// 关闭侧边栏
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// 处理遮罩层点击
function handleOverlayClick(e) {
  if (window.innerWidth <= 600) {
    closeSidebar();
  }
}

// 打开分类排序弹窗
function openSortModal() {
  const container = document.getElementById('sortList');
  
  if (categories.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500" style="padding: 20px;">暂无分类</p>';
    document.getElementById('sortModal').style.display = 'block';
    return;
  }
  
  container.innerHTML = categories.map((c, index) => `
    <div class="sort-item" data-id="${c.id}" data-index="${index}">
      <span class="sort-item-emoji">${c.icon}</span>
      <span class="sort-item-name">${escapeHtml(c.name)}</span>
      <div class="sort-item-actions">
        <button class="sort-btn" onclick="moveCategoryUp('${c.id}')" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="sort-btn" onclick="moveCategoryDown('${c.id}')" ${index === categories.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('sortModal').style.display = 'block';
}

// 关闭分类排序弹窗
function closeSortModal() {
  document.getElementById('sortModal').style.display = 'none';
}

// 上移分类
function moveCategoryUp(categoryId) {
  const index = categories.findIndex(c => c.id === categoryId);
  if (index > 0) {
    const temp = categories[index];
    categories[index] = categories[index - 1];
    categories[index - 1] = temp;
    openSortModal(); // 重新渲染
  }
}

// 下移分类
function moveCategoryDown(categoryId) {
  const index = categories.findIndex(c => c.id === categoryId);
  if (index < categories.length - 1) {
    const temp = categories[index];
    categories[index] = categories[index + 1];
    categories[index + 1] = temp;
    openSortModal(); // 重新渲染
  }
}

// 保存分类排序
async function saveCategoryOrder() {
  try {
    const order = categories.map((c, index) => ({
      id: c.id,
      sortOrder: index
    }));
    
    console.log('保存排序:', order);
    
    const response = await fetch(`${API_BASE}/categories/sort`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    
    console.log('排序保存响应:', response.status);
    
    if (!response.ok) {
      throw new Error('保存失败');
    }
    
    showToast('排序保存成功', 'success');
    closeSortModal();
    await loadCategories();
    await loadPasswords();
  } catch (error) {
    showToast('保存排序失败', 'error');
  }
}

// ==================== 主题管理 ====================

// 主题配置
const themes = {
  'default': {
    name: '默认紫',
    colors: ['#667eea', '#764ba2'],
    textColor: '#ffffff',
    textColorSecondary: 'rgba(255,255,255,0.8)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardText: '#333333'
  },
  'github-dark': {
    name: 'GitHub黑',
    colors: ['#0d1117', '#161b22'],
    textColor: '#ffffff',
    textColorSecondary: 'rgba(255,255,255,0.7)',
    cardBg: '#21262d',
    cardText: '#e6edf3'
  },
  'github-light': {
    name: 'GitHub白',
    colors: ['#f6f8fa', '#ffffff'],
    textColor: '#24292f',
    textColorSecondary: '#656d76',
    cardBg: '#ffffff',
    cardText: '#24292f'
  },
  'ocean': {
    name: '海洋蓝',
    colors: ['#2193b0', '#6dd5ed'],
    textColor: '#ffffff',
    textColorSecondary: 'rgba(255,255,255,0.8)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardText: '#333333'
  },
  'sunset': {
    name: '日落红',
    colors: ['#ff512f', '#dd2476'],
    textColor: '#ffffff',
    textColorSecondary: 'rgba(255,255,255,0.8)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardText: '#333333'
  },
  'forest': {
    name: '森林绿',
    colors: ['#11998e', '#38ef7d'],
    textColor: '#ffffff',
    textColorSecondary: 'rgba(255,255,255,0.8)',
    cardBg: 'rgba(255,255,255,0.95)',
    cardText: '#333333'
  }
};

// 当前主题
let currentTheme = localStorage.getItem('theme') || 'default';

// 应用主题
function applyTheme(themeName, showNotification = true) {
  const theme = themes[themeName];
  if (!theme) return;
  
  currentTheme = themeName;
  const body = document.body;
  
  // 移除所有主题类
  Object.keys(themes).forEach(key => {
    body.classList.remove(`theme-${key}`);
  });
  
  // 添加新主题类
  body.classList.add(`theme-${themeName}`);
  
  // 应用 CSS 变量
  body.style.setProperty('--theme-color-1', theme.colors[0]);
  body.style.setProperty('--theme-color-2', theme.colors[1]);
  body.style.setProperty('--text-color', theme.textColor);
  body.style.setProperty('--text-color-secondary', theme.textColorSecondary);
  body.style.setProperty('--card-bg', theme.cardBg);
  body.style.setProperty('--card-text', theme.cardText);
  body.style.background = `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 100%)`;
  
  // 保存到本地存储
  localStorage.setItem('theme', themeName);
  
  // 更新选中状态
  document.querySelectorAll('.theme-preset').forEach(preset => {
    preset.classList.remove('active');
    if (preset.dataset.theme === themeName) {
      preset.classList.add('active');
    }
  });
  
  if (showNotification) {
    showToast(`已切换到${theme.name}主题`, 'success');
  }
}

// 计算颜色亮度 (0-255)
function getColorBrightness(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// 应用自定义主题
function applyCustomTheme() {
  const color1 = document.getElementById('customColor1').value;
  const color2 = document.getElementById('customColor2').value;
  const textColor = document.getElementById('customTextColor').value;
  const cardTextColor = document.getElementById('customCardTextColor').value;
  
  currentTheme = 'custom';
  const body = document.body;
  
  // 移除所有主题类
  Object.keys(themes).forEach(key => {
    body.classList.remove(`theme-${key}`);
  });
  
  // 计算背景平均亮度来决定次要文字颜色
  const brightness1 = getColorBrightness(color1);
  const brightness2 = getColorBrightness(color2);
  const avgBrightness = (brightness1 + brightness2) / 2;
  
  // 计算次要文字颜色（根据主文字颜色自动调整）
  const textBrightness = getColorBrightness(textColor);
  const textColorSecondary = textBrightness > 128 ? '#656d76' : 'rgba(255,255,255,0.8)';
  
  // 卡片背景色（根据背景亮度调整）
  const cardBg = avgBrightness > 128 ? '#ffffff' : 'rgba(255,255,255,0.95)';
  
  // 应用自定义颜色
  body.style.setProperty('--theme-color-1', color1);
  body.style.setProperty('--theme-color-2', color2);
  body.style.setProperty('--text-color', textColor);
  body.style.setProperty('--text-color-secondary', textColorSecondary);
  body.style.setProperty('--card-bg', cardBg);
  body.style.setProperty('--card-text', cardTextColor);
  body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  
  // 保存到本地存储
  localStorage.setItem('theme', 'custom');
  localStorage.setItem('customThemeColors', JSON.stringify({
    bg1: color1,
    bg2: color2,
    text: textColor,
    cardText: cardTextColor
  }));
  
  // 移除预设主题的选中状态
  document.querySelectorAll('.theme-preset').forEach(preset => {
    preset.classList.remove('active');
  });
  
  showToast('已应用自定义主题', 'success');
}

// 更新自定义主题预览
function updateCustomTheme() {
  const color1 = document.getElementById('customColor1').value;
  const color2 = document.getElementById('customColor2').value;
  
  // 可以在这里添加预览逻辑
  console.log('自定义颜色:', color1, color2);
}

// 加载保存的主题
function loadSavedTheme() {
  const savedTheme = localStorage.getItem('theme') || 'default';
  
  if (savedTheme === 'custom') {
    let customColors = JSON.parse(localStorage.getItem('customThemeColors') || '{"bg1":"#667eea","bg2":"#764ba2","text":"#ffffff","cardText":"#333333"}');
    
    // 处理旧格式（数组格式）转换为新格式（对象格式）
    if (Array.isArray(customColors)) {
      customColors = {
        bg1: customColors[0] || '#667eea',
        bg2: customColors[1] || '#764ba2',
        text: '#ffffff',
        cardText: '#333333'
      };
    }
    
    document.getElementById('customColor1').value = customColors.bg1;
    document.getElementById('customColor2').value = customColors.bg2;
    document.getElementById('customTextColor').value = customColors.text;
    document.getElementById('customCardTextColor').value = customColors.cardText;
    
    const body = document.body;
    
    // 计算背景平均亮度来决定次要文字颜色
    const brightness1 = getColorBrightness(customColors.bg1);
    const brightness2 = getColorBrightness(customColors.bg2);
    const avgBrightness = (brightness1 + brightness2) / 2;
    
    // 计算次要文字颜色
    const textBrightness = getColorBrightness(customColors.text);
    const textColorSecondary = textBrightness > 128 ? '#656d76' : 'rgba(255,255,255,0.8)';
    
    // 卡片背景色
    const cardBg = avgBrightness > 128 ? '#ffffff' : 'rgba(255,255,255,0.95)';
    
    body.style.setProperty('--theme-color-1', customColors.bg1);
    body.style.setProperty('--theme-color-2', customColors.bg2);
    body.style.setProperty('--text-color', customColors.text);
    body.style.setProperty('--text-color-secondary', textColorSecondary);
    body.style.setProperty('--card-bg', cardBg);
    body.style.setProperty('--card-text', customColors.cardText);
    body.style.background = `linear-gradient(135deg, ${customColors.bg1} 0%, ${customColors.bg2} 100%)`;
  } else {
    applyTheme(savedTheme, false);
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  init();
  loadSavedTheme();
});
