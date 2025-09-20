// 全局变量
let currentNoteId = null;
let notes = [];
let todos = [];
let chatMessages = []; // AI对话消息历史
let isAiResponding = false; // AI是否正在响应
let projects = [];
let currentProjectId = null;
let currentTaskId = null;
let currentProjectTasks = [];
let projectFilter = 'all'; // all, active, completed, archived
let taskFilter = 'all'; // all, pending, in_progress, completed

// 新增：番茄钟全局状态
let pomodoroSettings = { workTime: 25, shortBreak: 5, longBreak: 15 };  // 基础时长（分钟）
let pomodoroStats = { completedPomodoros: 0, totalFocusTime: 0, sessions: [], lastDate: new Date().toDateString(), dailyGoal: 8 }; // 统计
let pomodoroState = 'work';                  // 'work' | 'short-break' | 'long-break'
let pomodoroSession = 0;                     // 每 4 个 work 进入长休
let pomodoroTimeLeft = pomodoroSettings.workTime * 60; // 当前剩余秒数
let pomodoroTimer = null;                    // 计时器句柄
let isRunning = false;                       // 番茄钟是否运行

// DOM元素 - 将在DOMContentLoaded中获取
let notesList, noteView, noteEditor, welcomeView, noteForm, noteTitle, noteContent;
let noteViewTitle, noteViewDate, noteViewContent, newNoteBtn, welcomeNewNoteBtn, editNoteBtn, deleteNoteBtn;
let cancelEditBtn, editorTitle, confirmDeleteBtn, searchInput;

// 待办列表DOM元素
let todosList, newTodoInput, addTodoBtn;

// AI对话DOM元素
let notesTabBtn, aiChatTabBtn, pomodoroTabBtn, projectTabBtn;
let notesPage, aiChatPage, pomodoroPage, projectsPage;
let chatMessages_div, chatInput, sendChatBtn, clearChatBtn;

// 番茄钟 DOM 元素
let timerDisplay, timerStatus, sessionInfo, progressCircle;
let startPauseBtn, resetBtn, workTimeInput, shortBreakInput, longBreakInput;
let completedPomodoros, totalFocusTime, dailyProgress, recentSessions;
let workTimeUp, workTimeDown, shortBreakUp, shortBreakDown, longBreakUp, longBreakDown;

// 项目管理相关元素
let projectsList, projectWelcomeView, projectDetailView, projectEditForm;
let projectForm, projectSearchInput;

// AI智能建议相关变量
let aiSuggestions = {
    projectOptimization: [],
    taskAnalysis: [],
    isAnalyzing: false
};

// 自定义组件
let deleteModal = null;
let toast = null;
let projectDeleteModal = null;
let taskModal = null;

// 初始化自定义组件
function initCustomComponents() {
    deleteModal = CustomModal.getInstance(document.getElementById('deleteModal'));
    toast = CustomToast.getInstance(document.getElementById('toast'));
    
    const projectDeleteModalEl = document.getElementById('projectDeleteModal');
    if (projectDeleteModalEl) {
        projectDeleteModal = CustomModal.getInstance(projectDeleteModalEl);
    }
    
    const taskModalEl = document.getElementById('taskModal');
    if (taskModalEl) {
        taskModal = CustomModal.getInstance(taskModalEl);
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');

    // 获取DOM元素
    getDOMElements();

    // 调试DOM元素选择
    console.log('Navigation elements:');
    console.log('notesTabBtn:', notesTabBtn);
    console.log('aiChatTabBtn:', aiChatTabBtn);
    console.log('pomodoroTabBtn:', pomodoroTabBtn);
    console.log('projectTabBtn:', projectTabBtn);
    console.log('notesPage:', notesPage);
    console.log('aiChatPage:', aiChatPage);
    console.log('pomodoroPage:', pomodoroPage);
    console.log('projectsPage:', projectsPage);

    // 初始化自定义组件
    initCustomComponents();

    // 加载笔记列表
    loadNotes();

    // 加载待办列表
    loadTodos();

    // 加载项目列表
    loadProjects();

    // 加载聊天历史
    loadChatHistory();

    // 初始化番茄钟
    initPomodoro();

    // 设置默认显示笔记页面
    switchTab('notes');

    // 绑定事件
    if (newNoteBtn) {
        newNoteBtn.addEventListener('click', showNewNoteForm);
    }
    if (welcomeNewNoteBtn) {
        welcomeNewNoteBtn.addEventListener('click', showNewNoteForm);
    }
    editNoteBtn.addEventListener('click', showEditNoteForm);
    deleteNoteBtn.addEventListener('click', showDeleteConfirmation);
    cancelEditBtn.addEventListener('click', cancelEdit);
    noteForm.addEventListener('submit', saveNote);
    confirmDeleteBtn.addEventListener('click', deleteNote);
    searchInput.addEventListener('input', filterNotes);
    
    // 待办列表事件
    addTodoBtn.addEventListener('click', addTodo);
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // 页面切换事件 - 移除，因为HTML中已经有onclick处理器
    
    // AI对话事件
    sendChatBtn.addEventListener('click', sendMessage);
    clearChatBtn.addEventListener('click', clearChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 新增：番茄钟按钮事件
    startPauseBtn.addEventListener('click', togglePomodoro);
    resetBtn.addEventListener('click', resetPomodoro);

    workTimeUp.addEventListener('click', () => { adjustTime('work', 1); savePomodoroSettings(); updatePomodoroDisplay(); });
    workTimeDown.addEventListener('click', () => { adjustTime('work', -1); savePomodoroSettings(); updatePomodoroDisplay(); });
    shortBreakUp.addEventListener('click', () => { adjustTime('shortBreak', 1); savePomodoroSettings(); updatePomodoroDisplay(); });
    shortBreakDown.addEventListener('click', () => { adjustTime('shortBreak', -1); savePomodoroSettings(); updatePomodoroDisplay(); });
    longBreakUp.addEventListener('click', () => { adjustTime('longBreak', 1); savePomodoroSettings(); updatePomodoroDisplay(); });
    longBreakDown.addEventListener('click', () => { adjustTime('longBreak', -1); savePomodoroSettings(); updatePomodoroDisplay(); });

    // 项目管理事件 - HTML使用内联事件处理器，无需在此添加监听器
    if (projectSearchInput) projectSearchInput.addEventListener('input', searchProjects);
    // 任务管理也使用内联事件处理器

    // 项目和任务筛选器事件 - HTML使用内联事件处理器
    // filterProjects和filterTasks函数通过HTML onclick调用
});

// 筛选笔记
function filterNotes() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filteredNotes = searchTerm ? 
        notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            (note.content && note.content.toLowerCase().includes(searchTerm))
        ) : 
        notes;
    
    renderNotesList(filteredNotes);
}

// API请求函数
async function fetchAPI(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || '请求失败');
        }
        
        return result;
    } catch (error) {
        showToast('错误', error.message, 'error');
        throw error;
    }
}

// 加载笔记列表
async function loadNotes() {
    try {
        notes = await fetchAPI('/api/notes');
        renderNotesList();
    } catch (error) {
        console.error('加载笔记列表失败:', error);
    }
}

// 渲染笔记列表
function renderNotesList(notesToRender = notes) {
    notesList.innerHTML = '';
    
    if (notesToRender.length === 0) {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            notesList.innerHTML = `<li class="list-group-item text-center text-muted py-5">没有找到匹配"${escapeHtml(searchTerm)}"的笔记</li>`;
        } else {
            notesList.innerHTML = '<li class="list-group-item text-center text-muted py-5">暂无笔记</li>';
        }
        return;
    }
    
    notesToRender.forEach(note => {
        const li = document.createElement('li');
        li.className = 'list-group-item' + (note.id === currentNoteId ? ' active' : '');
        li.innerHTML = `
            <div class="note-item-title">${escapeHtml(note.title)}</div>
            <div class="note-item-date">${note.created_at}</div>
        `;
        li.addEventListener('click', () => viewNote(note.id));
        notesList.appendChild(li);
    });
}

// 查看笔记
async function viewNote(noteId) {
    try {
        const note = await fetchAPI(`/api/notes/${noteId}`);
        currentNoteId = note.id;
        
        // 更新UI
        noteViewTitle.textContent = note.title;
        noteViewDate.textContent = note.created_at;
        noteViewContent.textContent = note.content;
        
        // 显示笔记视图
        showView('view');
        
        // 更新列表中的活动项
        renderNotesList();
    } catch (error) {
        console.error('加载笔记详情失败:', error);
    }
}

// 显示新建笔记表单
function showNewNoteForm() {
    console.log('showNewNoteForm called');
    if (editorTitle) editorTitle.textContent = '新建笔记';
    if (noteForm) noteForm.reset();
    currentNoteId = null;
    showView('edit');
}

// 显示编辑笔记表单
function showEditNoteForm() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    editorTitle.textContent = '编辑笔记';
    noteTitle.value = note.title;
    
    // 获取笔记内容
    fetchAPI(`/api/notes/${currentNoteId}`)
        .then(fullNote => {
            noteContent.value = fullNote.content;
            showView('edit');
        })
        .catch(error => console.error('获取笔记内容失败:', error));
}

// 保存笔记
async function saveNote(event) {
    event.preventDefault();
    
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    
    if (!title || !content) {
        showToast('提示', '标题和内容不能为空', 'warning');
        return;
    }
    
    try {
        let note;
        
        if (currentNoteId) {
            // 更新笔记
            note = await fetchAPI(`/api/notes/${currentNoteId}`, 'PUT', { title, content });
            showToast('成功', '笔记已更新', 'success');
        } else {
            // 创建笔记
            note = await fetchAPI('/api/notes', 'POST', { title, content });
            showToast('成功', '笔记已创建', 'success');
        }
        
        // 重新加载笔记列表
        await loadNotes();
        
        // 查看新创建/更新的笔记
        viewNote(note.id);
    } catch (error) {
        console.error('保存笔记失败:', error);
    }
}

// 显示删除确认对话框
function showDeleteConfirmation() {
    if (!currentNoteId) return;
    deleteModal.show();
}

// 删除笔记
async function deleteNote() {
    if (!currentNoteId) return;
    
    try {
        await fetchAPI(`/api/notes/${currentNoteId}`, 'DELETE');
        showToast('成功', '笔记已删除', 'success');
        
        // 关闭确认对话框
        deleteModal.hide();
        
        // 重新加载笔记列表
        await loadNotes();
        
        // 重置当前笔记ID
        currentNoteId = null;
        
        // 显示欢迎视图
        showView('welcome');
    } catch (error) {
        console.error('删除笔记失败:', error);
    }
}

// 取消编辑
function cancelEdit() {
    if (currentNoteId) {
        showView('view');
    } else {
        showView('welcome');
    }
}

// 显示指定视图
function showView(view) {
    // 隐藏所有视图
    noteView.classList.add('hidden');
    noteEditor.classList.add('hidden');
    welcomeView.classList.add('hidden');
    
    // 显示指定视图
    switch (view) {
        case 'view':
            noteView.classList.remove('hidden');
            break;
        case 'edit':
            noteEditor.classList.remove('hidden');
            setTimeout(() => noteTitle.focus(), 100);
            break;
        case 'welcome':
            welcomeView.classList.remove('hidden');
            break;
    }
}

// 显示提示消息
function showToast(title, message, type = 'info') {
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // 设置图标和样式
    toastIcon.className = 'bi me-2';
    document.getElementById('toast').className = 'toast';
    
    switch (type) {
        case 'success':
            toastIcon.classList.add('bi-check-circle-fill', 'text-success');
            document.getElementById('toast').classList.add('bg-light', 'text-dark');
            break;
        case 'error':
            toastIcon.classList.add('bi-exclamation-circle-fill', 'text-danger');
            document.getElementById('toast').classList.add('bg-light', 'text-dark');
            break;
        case 'warning':
            toastIcon.classList.add('bi-exclamation-triangle-fill', 'text-warning');
            document.getElementById('toast').classList.add('bg-light', 'text-dark');
            break;
        default:
            toastIcon.classList.add('bi-info-circle-fill', 'text-info');
            document.getElementById('toast').classList.add('bg-light', 'text-dark');
    }
    
    toast.show();
}

// 转义HTML特殊字符
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 加载待办列表
async function loadTodos() {
    try {
        todos = await fetchAPI('/api/todos');
        renderTodosList();
    } catch (error) {
        console.error('加载待办列表失败:', error);
    }
}

// 渲染待办列表
function renderTodosList() {
    todosList.innerHTML = '';
    
    if (todos.length === 0) {
        todosList.innerHTML = '<li class="flex items-center justify-center py-8 text-center text-muted-foreground">暂无待办事项</li>';
        return;
    }
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between p-4 border-b border-border last:border-b-0';
        li.innerHTML = `
            <div class="flex items-center space-x-3">
                <input class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" type="checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="toggleTodo('${todo.id}', this.checked)">
                <label class="text-sm ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}">
                    ${escapeHtml(todo.title)}
                </label>
            </div>
            <button class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8" onclick="deleteTodo('${todo.id}')">
                <i class="bi bi-trash text-xs"></i>
            </button>
        `;
        todosList.appendChild(li);
    });
}

// 添加新待办
async function addTodo() {
    const title = newTodoInput.value.trim();
    
    if (!title) {
        showToast('提示', '请输入待办内容', 'warning');
        return;
    }
    
    try {
        await fetchAPI('/api/todos', 'POST', { title });
        newTodoInput.value = '';
        await loadTodos();
        showToast('成功', '待办已添加', 'success');
    } catch (error) {
        console.error('添加待办失败:', error);
    }
}

// 切换待办完成状态
async function toggleTodo(todoId, completed) {
    try {
        await fetchAPI(`/api/todos/${todoId}`, 'PUT', { completed });
        await loadTodos();
    } catch (error) {
        console.error('更新待办状态失败:', error);
        // 重新加载以恢复状态
        await loadTodos();
    }
}

// 删除待办
async function deleteTodo(todoId) {
    if (!confirm('确定要删除这个待办事项吗？')) {
        return;
    }
    
    try {
        await fetchAPI(`/api/todos/${todoId}`, 'DELETE');
        await loadTodos();
        showToast('成功', '待办已删除', 'success');
    } catch (error) {
        console.error('删除待办失败:', error);
    }
}

// AI对话功能

// 切换标签页
function switchTab(tab) {
    console.log('switchTab called with tab:', tab);

    // 移除所有按钮的active状态
    if (notesTabBtn) {
        notesTabBtn.classList.remove('active');
        // 重置为默认样式
        notesTabBtn.classList.remove('text-primary', 'bg-accent');
        notesTabBtn.classList.add('text-muted-foreground');
    }
    if (aiChatTabBtn) {
        aiChatTabBtn.classList.remove('active');
        aiChatTabBtn.classList.remove('text-primary', 'bg-accent');
        aiChatTabBtn.classList.add('text-muted-foreground');
    }
    if (pomodoroTabBtn) {
        pomodoroTabBtn.classList.remove('active');
        pomodoroTabBtn.classList.remove('text-primary', 'bg-accent');
        pomodoroTabBtn.classList.add('text-muted-foreground');
    }
    if (projectTabBtn) {
        projectTabBtn.classList.remove('active');
        projectTabBtn.classList.remove('text-primary', 'bg-accent');
        projectTabBtn.classList.add('text-muted-foreground');
    }

    // 隐藏所有页面
    if (notesPage) notesPage.classList.add('hidden');
    if (aiChatPage) aiChatPage.classList.add('hidden');
    if (pomodoroPage) pomodoroPage.classList.add('hidden');
    if (projectsPage) projectsPage.classList.add('hidden');

    if (tab === 'notes') {
        if (notesTabBtn) {
            notesTabBtn.classList.add('active');
            notesTabBtn.classList.remove('text-muted-foreground');
            notesTabBtn.classList.add('text-primary', 'bg-accent');
        }
        if (notesPage) notesPage.classList.remove('hidden');
        if (newNoteBtn) newNoteBtn.style.display = 'block';
    } else if (tab === 'ai-chat') {
        if (aiChatTabBtn) {
            aiChatTabBtn.classList.add('active');
            aiChatTabBtn.classList.remove('text-muted-foreground');
            aiChatTabBtn.classList.add('text-primary', 'bg-accent');
        }
        if (aiChatPage) aiChatPage.classList.remove('hidden');
        if (newNoteBtn) newNoteBtn.style.display = 'none';
    } else if (tab === 'pomodoro') {
        if (pomodoroTabBtn) {
            pomodoroTabBtn.classList.add('active');
            pomodoroTabBtn.classList.remove('text-muted-foreground');
            pomodoroTabBtn.classList.add('text-primary', 'bg-accent');
        }
        if (pomodoroPage) pomodoroPage.classList.remove('hidden');
        if (newNoteBtn) newNoteBtn.style.display = 'none';
    } else if (tab === 'projects') {
        if (projectTabBtn) {
            projectTabBtn.classList.add('active');
            projectTabBtn.classList.remove('text-muted-foreground');
            projectTabBtn.classList.add('text-primary', 'bg-accent');
        }
        if (projectsPage) projectsPage.classList.remove('hidden');
        showProjectView('list');
        loadProjects();
        if (newNoteBtn) newNoteBtn.style.display = 'none';
    }
}

// 加载聊天历史
function loadChatHistory() {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
        chatMessages = JSON.parse(savedMessages);
        renderChatMessages();
    }
}

// 保存聊天历史
function saveChatHistory() {
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
}

// 渲染聊天消息
function renderChatMessages() {
    if (chatMessages.length === 0) {
        chatMessages_div.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-robot display-4 mb-3"></i>
                <h5>AI智能助手</h5>
                <p>您好！我是您的AI助手，有什么可以帮助您的吗？</p>
            </div>
        `;
        return;
    }
    
    chatMessages_div.innerHTML = chatMessages.map(msg => {
        const messageClass = msg.role === 'user' ? 'user' : 'assistant';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        
        return `
            <div class="message ${messageClass}">
                <div class="message-content">
                    ${escapeHtml(msg.content)}
                </div>
                <div class="message-time text-${msg.role === 'user' ? 'end' : 'start'}">
                    ${time}
                </div>
            </div>
        `;
    }).join('');
    
    // 滚动到底部
    chatMessages_div.scrollTop = chatMessages_div.scrollHeight;
}

// 发送消息
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isAiResponding) {
        return;
    }
    
    // 添加用户消息
    const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    };
    
    chatMessages.push(userMessage);
    chatInput.value = '';
    renderChatMessages();
    saveChatHistory();
    
    // 显示AI正在输入的提示
    showTypingIndicator();
    isAiResponding = true;
    sendChatBtn.disabled = true;
    
    try {
        // 调用AI API
        const response = await fetchAPI('/api/chat', 'POST', {
            message: message,
            history: chatMessages.slice(-10) // 只发送最近10条消息作为上下文
        });
        
        // 添加AI回复
        const aiMessage = {
            role: 'assistant',
            content: response.reply,
            timestamp: new Date().toISOString()
        };
        
        chatMessages.push(aiMessage);
        hideTypingIndicator();
        renderChatMessages();
        saveChatHistory();
        
    } catch (error) {
        console.error('AI对话失败:', error);
        hideTypingIndicator();
        
        // 添加错误消息
        const errorMessage = {
            role: 'assistant',
            content: '抱歉，我现在无法回复您的消息。请稍后再试。',
            timestamp: new Date().toISOString()
        };
        
        chatMessages.push(errorMessage);
        renderChatMessages();
        saveChatHistory();
        
        showToast('错误', 'AI服务暂时不可用', 'error');
    } finally {
        isAiResponding = false;
        sendChatBtn.disabled = false;
    }
}

// 显示AI正在输入的提示
function showTypingIndicator() {
    const typingHtml = `
        <div class="message assistant typing-message">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages_div.insertAdjacentHTML('beforeend', typingHtml);
    chatMessages_div.scrollTop = chatMessages_div.scrollHeight;
}

// 隐藏AI正在输入的提示
function hideTypingIndicator() {
    const typingMessage = chatMessages_div.querySelector('.typing-message');
    if (typingMessage) {
        typingMessage.remove();
    }
}

// 清空聊天记录
function clearChat() {
    if (confirm('确定要清空所有聊天记录吗？此操作不可撤销。')) {
        chatMessages = [];
        localStorage.removeItem('chatMessages');
        renderChatMessages();
        showToast('成功', '聊天记录已清空', 'success');
    }
}

// ==================== 番茄钟功能 ====================

// 初始化番茄钟
function initPomodoro() {
    loadPomodoroStats();
    loadPomodoroSettings();
    updatePomodoroDisplay();
    updateStatsDisplay();
}

// 加载番茄钟统计数据
function loadPomodoroStats() {
    const savedStats = localStorage.getItem('pomodoroStats');
    if (savedStats) {
        pomodoroStats = JSON.parse(savedStats);
        // 检查是否是新的一天，如果是则重置每日统计
        const today = new Date().toDateString();
        const lastDate = pomodoroStats.lastDate || '';
        if (today !== lastDate) {
            pomodoroStats.completedPomodoros = 0;
            pomodoroStats.totalFocusTime = 0;
            pomodoroStats.sessions = [];
            pomodoroStats.lastDate = today;
        }
    }
}

// 保存番茄钟统计数据
function savePomodoroStats() {
    pomodoroStats.lastDate = new Date().toDateString();
    localStorage.setItem('pomodoroStats', JSON.stringify(pomodoroStats));
}

// 加载番茄钟设置
function loadPomodoroSettings() {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
        pomodoroSettings = JSON.parse(savedSettings);
    }
    
    // 更新输入框显示
    workTimeInput.value = pomodoroSettings.workTime;
    shortBreakInput.value = pomodoroSettings.shortBreak;
    longBreakInput.value = pomodoroSettings.longBreak;
    
    // 重置当前时间
    resetToCurrentState();
}

// 保存番茄钟设置
function savePomodoroSettings() {
    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings));
}

// 调整时间设置
function adjustTime(type, delta) {
    if (isRunning) return; // 运行时不允许调整
    
    if (type === 'work') {
        pomodoroSettings.workTime = Math.max(1, Math.min(60, pomodoroSettings.workTime + delta));
        workTimeInput.value = pomodoroSettings.workTime;
    } else if (type === 'shortBreak') {
        pomodoroSettings.shortBreak = Math.max(1, Math.min(30, pomodoroSettings.shortBreak + delta));
        shortBreakInput.value = pomodoroSettings.shortBreak;
    } else if (type === 'longBreak') {
        pomodoroSettings.longBreak = Math.max(1, Math.min(60, pomodoroSettings.longBreak + delta));
        longBreakInput.value = pomodoroSettings.longBreak;
    }
    
    savePomodoroSettings();
    resetToCurrentState();
}

// 重置到当前状态的时间
function resetToCurrentState() {
    if (pomodoroState === 'work') {
        pomodoroTimeLeft = pomodoroSettings.workTime * 60;
    } else if (pomodoroState === 'short-break') {
        pomodoroTimeLeft = pomodoroSettings.shortBreak * 60;
    } else if (pomodoroState === 'long-break') {
        pomodoroTimeLeft = pomodoroSettings.longBreak * 60;
    }
    updatePomodoroDisplay();
}

// 开始/暂停番茄钟
function togglePomodoro() {
    if (isRunning) {
        pausePomodoro();
    } else {
        startPomodoro();
    }
}

// 开始番茄钟
function startPomodoro() {
    isRunning = true;
    startPauseBtn.innerHTML = '<i class="bi bi-pause-fill me-1"></i>暂停';
    startPauseBtn.classList.remove('btn-success');
    startPauseBtn.classList.add('btn-warning');
    timerStatus.textContent = '进行中';
    
    // 添加活动动画
    document.querySelector('.pomodoro-timer-container').classList.add('active');
    
    pomodoroTimer = setInterval(() => {
        pomodoroTimeLeft--;
        updatePomodoroDisplay();
        
        if (pomodoroTimeLeft <= 0) {
            completeSession();
        }
    }, 1000);
    
    // 请求通知权限
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// 暂停番茄钟
function pausePomodoro() {
    isRunning = false;
    clearInterval(pomodoroTimer);
    startPauseBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i>继续';
    startPauseBtn.classList.remove('btn-warning');
    startPauseBtn.classList.add('btn-success');
    timerStatus.textContent = '已暂停';
    
    // 移除活动动画
    document.querySelector('.pomodoro-timer-container').classList.remove('active');
}

// 重置番茄钟
function resetPomodoro() {
    isRunning = false;
    clearInterval(pomodoroTimer);
    
    startPauseBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i>开始';
    startPauseBtn.classList.remove('btn-warning');
    startPauseBtn.classList.add('btn-success');
    timerStatus.textContent = '准备开始';
    
    // 移除活动动画
    document.querySelector('.pomodoro-timer-container').classList.remove('active');
    
    resetToCurrentState();
}

// 完成一个会话
function completeSession() {
    isRunning = false;
    clearInterval(pomodoroTimer);
    
    // 移除活动动画
    document.querySelector('.pomodoro-timer-container').classList.remove('active');
    
    // 播放通知音效
    playNotificationSound();
    
    // 显示通知
    showNotification();
    
    // 记录会话
    recordSession();
    
    // 切换到下一个状态
    switchToNextState();
    
    // 重置按钮状态
    startPauseBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i>开始';
    startPauseBtn.classList.remove('btn-warning');
    startPauseBtn.classList.add('btn-success');
    timerStatus.textContent = '准备开始';
    
    updatePomodoroDisplay();
    updateStatsDisplay();
}

// 切换到下一个状态
function switchToNextState() {
    if (pomodoroState === 'work') {
        pomodoroSession++;
        pomodoroStats.completedPomodoros++;
        pomodoroStats.totalFocusTime += pomodoroSettings.workTime;
        
        // 每4个番茄钟后进入长休息
        if (pomodoroSession % 4 === 0) {
            pomodoroState = 'long-break';
            pomodoroTimeLeft = pomodoroSettings.longBreak * 60;
        } else {
            pomodoroState = 'short-break';
            pomodoroTimeLeft = pomodoroSettings.shortBreak * 60;
        }
    } else {
        // 从休息状态回到工作状态
        pomodoroState = 'work';
        pomodoroTimeLeft = pomodoroSettings.workTime * 60;
    }
    
    savePomodoroStats();
}

// 记录会话
function recordSession() {
    const now = new Date();
    const session = {
        type: pomodoroState,
        duration: pomodoroState === 'work' ? pomodoroSettings.workTime : 
                 pomodoroState === 'short-break' ? pomodoroSettings.shortBreak : pomodoroSettings.longBreak,
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    
    pomodoroStats.sessions.unshift(session);
    
    // 只保留最近20条记录
    if (pomodoroStats.sessions.length > 20) {
        pomodoroStats.sessions = pomodoroStats.sessions.slice(0, 20);
    }
}

// 播放通知音效
function playNotificationSound() {
    // 创建音频上下文播放提示音
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('无法播放音效:', error);
    }
}

// 显示通知
function showNotification() {
    let title, message;
    
    if (pomodoroState === 'work') {
        title = '🍅 工作时间结束！';
        message = '恭喜完成一个番茄钟！是时候休息一下了。';
    } else if (pomodoroState === 'short-break') {
        title = '☕ 短休息结束！';
        message = '休息结束，准备开始下一个番茄钟吧！';
    } else {
        title = '🌟 长休息结束！';
        message = '长休息结束，准备开始新的工作周期！';
    }
    
    // 浏览器通知
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/static/favicon.ico'
        });
    }
    
    // Toast通知
    showToast(title, message, 'success');
}

// 更新番茄钟显示
function updatePomodoroDisplay() {
    // 更新时间显示
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新状态信息
    if (pomodoroState === 'work') {
        sessionInfo.textContent = '工作时间';
        progressCircle.classList.remove('short-break', 'long-break');
        progressCircle.classList.add('work');
    } else if (pomodoroState === 'short-break') {
        sessionInfo.textContent = '短休息';
        progressCircle.classList.remove('work', 'long-break');
        progressCircle.classList.add('short-break');
    } else {
        sessionInfo.textContent = '长休息';
        progressCircle.classList.remove('work', 'short-break');
        progressCircle.classList.add('long-break');
    }
    
    // 更新进度圆环
    updateProgressCircle();
}

// 更新进度圆环
function updateProgressCircle() {
    const totalTime = pomodoroState === 'work' ? pomodoroSettings.workTime * 60 :
                     pomodoroState === 'short-break' ? pomodoroSettings.shortBreak * 60 :
                     pomodoroSettings.longBreak * 60;
    
    const progress = (totalTime - pomodoroTimeLeft) / totalTime;
    const circumference = 2 * Math.PI * 140; // 半径为140
    const offset = circumference * (1 - progress);
    
    progressCircle.style.strokeDashoffset = offset;
}

// 更新统计显示
function updateStatsDisplay() {
    completedPomodoros.textContent = pomodoroStats.completedPomodoros;
    totalFocusTime.textContent = pomodoroStats.totalFocusTime;
    
    // 更新每日进度
    const progressPercent = Math.min(100, (pomodoroStats.completedPomodoros / pomodoroStats.dailyGoal) * 100);
    dailyProgress.style.width = `${progressPercent}%`;
    
    // 更新最近会话
    updateRecentSessions();
}

// 更新最近会话显示
function updateRecentSessions() {
    if (pomodoroStats.sessions.length === 0) {
        recentSessions.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-clock"></i>
                <div>暂无记录</div>
            </div>
        `;
        return;
    }
    
    const sessionsHtml = pomodoroStats.sessions.slice(0, 10).map(session => {
        const typeIcon = session.type === 'work' ? '🍅' : 
                        session.type === 'short-break' ? '☕' : '🌟';
        const typeName = session.type === 'work' ? '工作' : 
                        session.type === 'short-break' ? '短休息' : '长休息';
        
        return `
            <div class="session-record">
                <div class="session-type">
                    <span class="me-1">${typeIcon}</span>
                    ${typeName} (${session.duration}分钟)
                </div>
                <div class="session-time">${session.time}</div>
            </div>
        `;
    }).join('');
    
    recentSessions.innerHTML = sessionsHtml;
}

// ==================== 项目管理功能 ====================

// 加载项目列表
async function loadProjects() {
    try {
        const response = await fetchAPI('/api/projects');
        projects = response;
        renderProjectsList();
    } catch (error) {
        console.error('加载项目失败:', error);
        showToast('错误', '加载项目失败', 'error');
    }
}

// 渲染项目列表
function renderProjectsList() {
    if (!projectsList) return;
    
    projectsList.innerHTML = '';
    
    // 过滤项目
    let filteredProjects = projects;
    if (projectFilter !== 'all') {
        filteredProjects = projects.filter(project => project.status === projectFilter);
    }
    
    // 搜索过滤
    const searchTerm = projectSearchInput ? projectSearchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filteredProjects = filteredProjects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            project.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredProjects.length === 0) {
        projectsList.innerHTML = '<div class="text-center text-muted py-4">暂无项目</div>';
        return;
    }
    
    filteredProjects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'list-group-item list-group-item-action';
        projectItem.onclick = () => viewProject(project.id);
        
        const statusClass = getProjectStatusClass(project.status);
        const statusIcon = getProjectStatusIcon(project.status);
        const progress = project.progress || 0;
        
        projectItem.innerHTML = `
            <div class="project-card-title">${escapeHtml(project.name)}</div>
            <div class="project-card-description">${escapeHtml(project.description || '暂无描述')}</div>
            <div class="d-flex justify-content-between align-items-center mt-2 mb-2">
                <span class="project-status ${statusClass}">${statusIcon} ${getStatusText(project.status)}</span>
                <small class="text-muted">${progress}% 完成</small>
            </div>
            <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="project-card-meta">
                <small class="text-muted">📅 ${formatDate(project.created_at)}</small>
                <small class="text-muted">📋 任务</small>
            </div>
        `;
        
        projectsList.appendChild(projectItem);
    });
}

// 获取项目状态对应的CSS类
function getProjectStatusClass(status) {
    switch(status) {
        case 'planning': return 'status-planning';
        case 'in_progress': return 'status-in-progress';
        case 'completed': return 'status-completed';
        case 'on_hold': return 'status-on-hold';
        default: return 'status-planning';
    }
}

// 获取项目状态对应的图标
function getProjectStatusIcon(status) {
    switch(status) {
        case 'planning': return '📋';
        case 'in_progress': return '🚀';
        case 'completed': return '✅';
        case 'on_hold': return '⏸️';
        default: return '📋';
    }
}

// 获取状态文本
function getStatusText(status) {
    switch(status) {
        case 'planning': return '规划中';
        case 'in_progress': return '进行中';
        case 'completed': return '已完成';
        case 'on_hold': return '暂停';
        default: return '规划中';
    }
}

// 获取状态徽章
function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge bg-success">进行中</span>',
        'completed': '<span class="badge bg-primary">已完成</span>',
        'archived': '<span class="badge bg-secondary">已归档</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">未知</span>';
}

// 获取进度颜色
function getProgressColor(progress) {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
}

// 显示项目视图
function showProjectView(view) {
    // 隐藏所有视图
    if (projectWelcomeView) {
        projectWelcomeView.classList.add('hidden');
        projectWelcomeView.classList.remove('block');
    }
    if (projectDetailView) {
        projectDetailView.classList.add('hidden');
        projectDetailView.classList.remove('block');
    }
    if (projectEditForm) {
        projectEditForm.classList.add('hidden');
        projectEditForm.classList.remove('block');
    }
    
    if (view === 'list') {
        if (projectWelcomeView) {
            projectWelcomeView.classList.remove('hidden');
            projectWelcomeView.classList.add('block');
        }
    } else if (view === 'detail') {
        if (projectDetailView) {
            projectDetailView.classList.remove('hidden');
            projectDetailView.classList.add('block');
        }
    } else if (view === 'form') {
        if (projectEditForm) {
            projectEditForm.classList.remove('hidden');
            projectEditForm.classList.add('block');
        }
    }
}

// 查看项目详情
async function viewProject(projectId) {
    try {
        currentProjectId = projectId;
        const project = projects.find(p => p.id === projectId);
        if (!project) {
            showToast('错误', '项目不存在', 'error');
            return;
        }
        
        // 更新项目详情显示
        document.getElementById('projectDetailTitle').textContent = project.name;
    document.getElementById('projectDetailDescription').textContent = project.description || '暂无描述';
    document.getElementById('projectDetailDate').textContent = formatDate(project.created_at);
    document.getElementById('projectProgressText').textContent = project.progress + '%';
    
    // 更新进度条
    const progressBar = document.getElementById('projectProgressBar');
        if (progressBar) {
            progressBar.style.width = project.progress + '%';
            progressBar.className = `progress-bar bg-${getProgressColor(project.progress)}`;
        }
        
        // 加载项目任务
        await loadProjectTasks(projectId);
        
        // 更新数据可视化
        updateVisualizationForProject(projectId);
        
        showProjectView('detail');
    } catch (error) {
        console.error('查看项目失败:', error);
        showToast('错误', `查看项目失败: ${error.message || error}`, 'error');
    }
}

// 新建项目
function showNewProjectForm() {
    currentProjectId = null;
    const formTitle = document.getElementById('projectFormTitle');
    if (formTitle) formTitle.textContent = '新建项目';
    const projectName = document.getElementById('projectName');
    if (projectName) projectName.value = '';
    const projectDescription = document.getElementById('projectDescription');
    if (projectDescription) projectDescription.value = '';
    const projectStatus = document.getElementById('projectStatus');
    if (projectStatus) projectStatus.value = 'active';
    showProjectView('form');
}

function newProject() {
    showNewProjectForm();
}

function showEditProjectForm() {
    if (!currentProjectId) {
        showToast('错误', '请先选择一个项目', 'error');
        return;
    }
    editProject(currentProjectId);
}

function showDeleteProjectConfirmation() {
    if (!currentProjectId) {
        showToast('错误', '请先选择一个项目', 'error');
        return;
    }
    confirmDeleteProject(currentProjectId);
}

// 取消项目编辑
function cancelProjectEdit() {
    showProjectView('list');
    loadProjects();
}

// 编辑项目
function editProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        showToast('错误', '项目不存在', 'error');
        return;
    }
    
    currentProjectId = projectId;
    const formTitle = document.getElementById('projectFormTitle');
    if (formTitle) formTitle.textContent = '编辑项目';
    const projectName = document.getElementById('projectName');
    if (projectName) projectName.value = project.name;
    const projectDescription = document.getElementById('projectDescription');
    if (projectDescription) projectDescription.value = project.description || '';
    const projectStatus = document.getElementById('projectStatus');
    if (projectStatus) projectStatus.value = project.status;
    showProjectView('form');
}

// 保存项目
async function saveProject(event) {
    event.preventDefault();
    
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    const status = document.getElementById('projectStatus').value;
    
    if (!name) {
        showToast('错误', '请输入项目名称', 'error');
        return;
    }
    
    try {
        let response;
        if (currentProjectId) {
            // 更新项目
            response = await fetchAPI(`/api/projects/${currentProjectId}`, 'PUT', { name, description, status });
        } else {
            // 创建项目
            response = await fetchAPI('/api/projects', 'POST', { name, description, status });
        }
        
        showToast('成功', currentProjectId ? '项目更新成功' : '项目创建成功', 'success');
        await loadProjects();
        showProjectView('list');
    } catch (error) {
        console.error('保存项目失败:', error);
        showToast('错误', '保存项目失败', 'error');
    }
}

// 取消编辑项目
function cancelProject() {
    showProjectView('list');
}

// 确认删除项目
function confirmDeleteProject(projectId) {
    currentProjectId = projectId;
    const project = projects.find(p => p.id === projectId);
    if (project) {
        document.getElementById('project-delete-name').textContent = project.name;
    }
    
    if (projectDeleteModal) {
        projectDeleteModal.show();
    }
}

// 删除项目
async function deleteProject() {
    if (!currentProjectId) return;
    
    try {
        await fetchAPI(`/api/projects/${currentProjectId}`, 'DELETE');
        
        showToast('成功', '项目删除成功', 'success');
        await loadProjects();
        showProjectView('list');
        
        // 关闭模态框
        if (projectDeleteModal) {
            projectDeleteModal.hide();
        }
    } catch (error) {
        console.error('删除项目失败:', error);
        showToast('错误', '删除项目失败', 'error');
    }
}

// 返回项目列表
function backToProjects() {
    showProjectView('list');
}

// ==================== 项目任务管理功能 ====================

// 加载项目任务
async function loadProjectTasks(projectId) {
    try {
        const response = await fetchAPI(`/api/projects/${projectId}/tasks`);
        currentProjectTasks = response;
        renderTasksList();
    } catch (error) {
        console.error('加载任务失败:', error);
        showToast('错误', `加载任务失败: ${error.message || error}`, 'error');
    }
}

// 渲染任务列表
function renderTasksList() {
    if (!tasksList) return;
    
    tasksList.innerHTML = '';
    
    // 过滤任务
    let filteredTasks = currentProjectTasks;
    if (taskFilter !== 'all') {
        filteredTasks = currentProjectTasks.filter(task => task.status === taskFilter);
    }
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<div class="text-center text-muted py-4">暂无任务</div>';
        return;
    }
    
    filteredTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item mb-3';
        
        const priorityColor = getPriorityColor(task.priority);
        const statusBadge = getTaskStatusBadge(task.status);
        const dueDateStr = task.due_date ? formatDate(task.due_date) : '';
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
        
        taskItem.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">
                                <span class="badge bg-${priorityColor} me-2">${getPriorityText(task.priority)}</span>
                                ${escapeHtml(task.title)}
                            </h6>
                            <p class="text-muted small mb-2">${escapeHtml(task.description || '暂无描述')}</p>
                        </div>
                        <div class="text-end">
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            ${dueDateStr ? `<small class="text-muted ${isOverdue ? 'text-danger' : ''}">截止: ${dueDateStr}</small>` : ''}
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-sm" onclick="editTask('${task.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-success btn-sm" onclick="toggleTaskStatus('${task.id}')">
                                <i class="fas fa-${task.status === 'completed' ? 'undo' : 'check'}"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteTask('${task.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        tasksList.appendChild(taskItem);
    });
}

// 获取优先级颜色
function getPriorityColor(priority) {
    const colors = {
        'high': 'danger',
        'medium': 'warning',
        'low': 'info'
    };
    return colors[priority] || 'secondary';
}

// 获取优先级文本
function getPriorityText(priority) {
    const texts = {
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return texts[priority] || '未知';
}

// 获取任务状态徽章
function getTaskStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge bg-secondary">待处理</span>',
        'in_progress': '<span class="badge bg-primary">进行中</span>',
        'completed': '<span class="badge bg-success">已完成</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">未知</span>';
}

// 新建任务
function newTask() {
    if (!currentProjectId) {
        showToast('错误', '请先选择项目', 'error');
        return;
    }
    
    currentTaskId = null;
    document.getElementById('taskModalTitle').textContent = '新建任务';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskStatus').value = 'pending';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDueDate').value = '';
    
    if (taskModal) {
        taskModal.show();
    }
}

// 编辑任务
function editTask(taskId) {
    const task = currentProjectTasks.find(t => t.id === taskId);
    if (!task) {
        showToast('错误', '任务不存在', 'error');
        return;
    }
    
    currentTaskId = taskId;
    document.getElementById('taskModalTitle').textContent = '编辑任务';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.due_date || '';
    
    if (taskModal) {
        taskModal.show();
    }
}

// 保存任务
async function saveTask(event) {
    event.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const status = document.getElementById('taskStatus').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value || null;
    
    if (!title) {
        showToast('错误', '请输入任务标题', 'error');
        return;
    }
    
    try {
        let response;
        if (currentTaskId) {
            // 更新任务
            response = await fetchAPI(`/api/projects/${currentProjectId}/tasks/${currentTaskId}`, 'PUT', {
                title, description, status, priority, due_date: dueDate
            });
        } else {
            // 创建任务
            response = await fetchAPI(`/api/projects/${currentProjectId}/tasks`, 'POST', {
                title, description, status, priority, due_date: dueDate
            });
        }
        
        showToast('成功', currentTaskId ? '任务更新成功' : '任务创建成功', 'success');
        await loadProjectTasks(currentProjectId);
        await loadProjects(); // 更新项目进度
        
        // 关闭模态框
        if (taskModal) {
            taskModal.hide();
        }
    } catch (error) {
        console.error('保存任务失败:', error);
        showToast('错误', '保存任务失败', 'error');
    }
}

// 取消编辑任务
function cancelTask() {
    if (taskModal) {
        taskModal.hide();
    }
}

// 切换任务状态
async function toggleTaskStatus(taskId) {
    const task = currentProjectTasks.find(t => t.id === taskId);
    if (!task) {
        showToast('错误', '任务不存在', 'error');
        return;
    }
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    try {
        await fetchAPI(`/api/projects/${currentProjectId}/tasks/${taskId}`, 'PUT', {
            status: newStatus
        });
        
        showToast('成功', '任务状态更新成功', 'success');
        await loadProjectTasks(currentProjectId);
        await loadProjects(); // 更新项目进度
    } catch (error) {
        console.error('更新任务状态失败:', error);
        showToast('错误', '更新任务状态失败', 'error');
    }
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }
    
    try {
        await fetchAPI(`/api/projects/${currentProjectId}/tasks/${taskId}`, 'DELETE');
        
        showToast('成功', '任务删除成功', 'success');
        await loadProjectTasks(currentProjectId);
        await loadProjects(); // 更新项目进度
    } catch (error) {
        console.error('删除任务失败:', error);
        showToast('错误', '删除任务失败', 'error');
    }
}

// 过滤项目
function filterProjects(filter) {
    projectFilter = filter;
    
    // 更新按钮状态
    projectFilterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderProjectsList();
}

// 过滤任务
function filterTasks(filter) {
    taskFilter = filter;
    
    // 更新按钮状态
    taskFilterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderTasksList();
}

// 搜索项目
function searchProjects() {
    renderProjectsList();
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// AI智能建议功能
function generateAISuggestions() {
    if (aiSuggestions.isAnalyzing) return;
    
    aiSuggestions.isAnalyzing = true;
    updateAISuggestionsUI();
    
    // 模拟AI分析延迟
    setTimeout(() => {
        analyzeProjectData();
        aiSuggestions.isAnalyzing = false;
        updateAISuggestionsUI();
    }, 2000);
}

function analyzeProjectData() {
    const currentProject = projects.find(p => p.id === currentProjectId);
    if (!currentProject) return;
    
    // 生成项目优化建议
    aiSuggestions.projectOptimization = generateProjectOptimizationSuggestions(currentProject);
    
    // 生成任务分析建议
    aiSuggestions.taskAnalysis = generateTaskAnalysisSuggestions(currentProjectTasks);
}

function generateProjectOptimizationSuggestions(project) {
    const suggestions = [];
    const completedTasks = currentProjectTasks.filter(t => t.status === 'completed').length;
    const totalTasks = currentProjectTasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    if (progress < 30) {
        suggestions.push({
            type: 'warning',
            icon: '⚠️',
            title: '项目进度较慢',
            description: '建议重新评估任务优先级，专注于核心功能开发',
            action: '优化任务分配'
        });
    }
    
    if (totalTasks > 20) {
        suggestions.push({
            type: 'info',
            icon: '📋',
            title: '任务数量较多',
            description: '考虑将大任务拆分为更小的子任务，提高执行效率',
            action: '任务拆分'
        });
    }
    
    const highPriorityTasks = currentProjectTasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
    if (highPriorityTasks > 5) {
        suggestions.push({
            type: 'urgent',
            icon: '🔥',
            title: '高优先级任务过多',
            description: '建议重新评估任务优先级，避免资源分散',
            action: '优先级调整'
        });
    }
    
    if (suggestions.length === 0) {
        suggestions.push({
            type: 'success',
            icon: '✨',
            title: '项目进展良好',
            description: '当前项目管理状态良好，继续保持现有节奏',
            action: '继续优化'
        });
    }
    
    return suggestions;
}

function generateTaskAnalysisSuggestions(tasks) {
    const suggestions = [];
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    
    if (inProgressTasks.length > 3) {
        suggestions.push({
            type: 'warning',
            icon: '⏳',
            title: '并行任务过多',
            description: '建议专注完成当前任务，避免多任务切换降低效率',
            taskCount: inProgressTasks.length
        });
    }
    
    if (pendingTasks.length > 10) {
        suggestions.push({
            type: 'info',
            icon: '📝',
            title: '待办任务积压',
            description: '建议定期清理和重新评估待办任务列表',
            taskCount: pendingTasks.length
        });
    }
    
    // 智能任务排序建议
    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    
    suggestions.push({
        type: 'suggestion',
        icon: '🎯',
        title: 'AI推荐任务顺序',
        description: '基于优先级和依赖关系的智能排序建议',
        recommendedTasks: sortedTasks.slice(0, 3).map(t => t.title)
    });
    
    return suggestions;
}

function updateAISuggestionsUI() {
    const aiSuggestionsContainer = document.getElementById('aiSuggestions');
    if (!aiSuggestionsContainer) return;
    
    if (aiSuggestions.isAnalyzing) {
        aiSuggestionsContainer.innerHTML = `
            <div class="ai-analyzing">
                <div class="ai-pulse"></div>
                <span>AI正在分析项目数据...</span>
            </div>
        `;
        return;
    }
    
    let suggestionsHTML = '';
    
    // 项目优化建议
    if (aiSuggestions.projectOptimization.length > 0) {
        suggestionsHTML += '<div class="ai-suggestion-group">';
        suggestionsHTML += '<h4><i class="ai-icon">🤖</i> 项目优化建议</h4>';
        aiSuggestions.projectOptimization.forEach(suggestion => {
            suggestionsHTML += `
                <div class="ai-suggestion ai-suggestion-${suggestion.type}">
                    <div class="suggestion-icon">${suggestion.icon}</div>
                    <div class="suggestion-content">
                        <h5>${suggestion.title}</h5>
                        <p>${suggestion.description}</p>
                        <button class="ai-action-btn" onclick="applySuggestion('${suggestion.action}')">
                            ${suggestion.action}
                        </button>
                    </div>
                </div>
            `;
        });
        suggestionsHTML += '</div>';
    }
    
    // 任务分析建议
    if (aiSuggestions.taskAnalysis.length > 0) {
        suggestionsHTML += '<div class="ai-suggestion-group">';
        suggestionsHTML += '<h4><i class="ai-icon">📊</i> 任务智能分析</h4>';
        aiSuggestions.taskAnalysis.forEach(suggestion => {
            suggestionsHTML += `
                <div class="ai-suggestion ai-suggestion-${suggestion.type}">
                    <div class="suggestion-icon">${suggestion.icon}</div>
                    <div class="suggestion-content">
                        <h5>${suggestion.title}</h5>
                        <p>${suggestion.description}</p>
                        ${suggestion.taskCount ? `<span class="task-count">${suggestion.taskCount} 个任务</span>` : ''}
                        ${suggestion.recommendedTasks ? `
                            <div class="recommended-tasks">
                                <strong>推荐顺序：</strong>
                                <ol>
                                    ${suggestion.recommendedTasks.map(task => `<li>${task}</li>`).join('')}
                                </ol>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        suggestionsHTML += '</div>';
    }
    
    aiSuggestionsContainer.innerHTML = suggestionsHTML;
}

function applySuggestion(action) {
    showToast('AI建议', `正在应用建议：${action}`, 'info');
    // 这里可以实现具体的建议应用逻辑
}

// 智能搜索功能
function performAISearch(query) {
    const searchResults = [];
    const lowerQuery = query.toLowerCase();
    
    // 搜索项目
    projects.forEach(project => {
        if (project.title.toLowerCase().includes(lowerQuery) || 
            project.description.toLowerCase().includes(lowerQuery)) {
            searchResults.push({
                type: 'project',
                id: project.id,
                title: project.title,
                description: project.description,
                relevance: calculateRelevance(query, project.title + ' ' + project.description)
            });
        }
    });
    
    // 搜索任务
    currentProjectTasks.forEach(task => {
        if (task.title.toLowerCase().includes(lowerQuery) || 
            task.description.toLowerCase().includes(lowerQuery)) {
            searchResults.push({
                type: 'task',
                id: task.id,
                title: task.title,
                description: task.description,
                relevance: calculateRelevance(query, task.title + ' ' + task.description)
            });
        }
    });
    
    // 按相关性排序
    searchResults.sort((a, b) => b.relevance - a.relevance);
    
    return searchResults;
}

function calculateRelevance(query, text) {
    const queryWords = query.toLowerCase().split(' ');
    const textWords = text.toLowerCase().split(' ');
    let relevance = 0;
    
    queryWords.forEach(queryWord => {
        textWords.forEach(textWord => {
            if (textWord.includes(queryWord)) {
                relevance += queryWord.length / textWord.length;
            }
        });
    });
    
    return relevance;
}

// 初始化AI功能
function initAIFeatures() {
    // 监听项目切换，自动生成建议
    const originalViewProject = viewProject;
    window.viewProject = async function(projectId) {
        await originalViewProject(projectId);
        setTimeout(() => {
            generateAISuggestions();
        }, 500);
    };
    
    // 智能搜索输入监听
    const searchInput = document.getElementById('projectSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            if (query.length > 2) {
                const results = performAISearch(query);
                displaySearchResults(results);
            }
        });
    }
}

function displaySearchResults(results) {
    // 这里可以实现搜索结果的显示逻辑
    console.log('AI搜索结果:', results);
}

// 在页面加载时初始化AI功能
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initAIFeatures();
        initializeDataVisualization();
    }, 1000);
});

// 全局暴露AI建议生成函数
window.generateAISuggestions = generateAISuggestions;

// AI数据可视化功能
function initializeDataVisualization() {
    // 初始化项目健康度雷达图
    initHealthRadarChart();
    
    // 初始化效率趋势图
    initEfficiencyChart();
    
    // 更新预测数据
    updatePredictionData();
}

function initHealthRadarChart() {
    const canvas = document.getElementById('healthRadarChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 雷达图数据
    const data = {
        labels: ['进度完成度', '任务分布', '优先级平衡', '团队协作', '质量控制', '时间管理'],
        values: [0.8, 0.6, 0.7, 0.9, 0.75, 0.65] // 0-1之间的值
    };
    
    // 绘制背景网格
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    // 绘制轴线
    for (let i = 0; i < data.labels.length; i++) {
        const angle = (i * 2 * Math.PI) / data.labels.length - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    
    // 绘制数据区域
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    for (let i = 0; i < data.values.length; i++) {
        const angle = (i * 2 * Math.PI) / data.values.length - Math.PI / 2;
        const value = data.values[i];
        const x = centerX + Math.cos(angle) * radius * value;
        const y = centerY + Math.sin(angle) * radius * value;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 绘制数据点
    ctx.fillStyle = 'rgba(59, 130, 246, 1)';
    for (let i = 0; i < data.values.length; i++) {
        const angle = (i * 2 * Math.PI) / data.values.length - Math.PI / 2;
        const value = data.values[i];
        const x = centerX + Math.cos(angle) * radius * value;
        const y = centerY + Math.sin(angle) * radius * value;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function initEfficiencyChart() {
    const canvas = document.getElementById('efficiencyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 模拟一周的效率数据
    const data = {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        values: [65, 78, 82, 75, 88, 70, 60]
    };
    
    const maxValue = Math.max(...data.values);
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 绘制背景网格
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
    ctx.lineWidth = 1;
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight * i) / 5;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // 绘制效率曲线
    ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 创建渐变
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
    
    // 绘制填充区域
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    for (let i = 0; i < data.values.length; i++) {
        const x = padding + (chartWidth * i) / (data.values.length - 1);
        const y = height - padding - (chartHeight * data.values[i]) / 100;
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // 绘制线条
    ctx.beginPath();
    for (let i = 0; i < data.values.length; i++) {
        const x = padding + (chartWidth * i) / (data.values.length - 1);
        const y = height - padding - (chartHeight * data.values[i]) / 100;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // 绘制数据点
    ctx.fillStyle = 'rgba(59, 130, 246, 1)';
    for (let i = 0; i < data.values.length; i++) {
        const x = padding + (chartWidth * i) / (data.values.length - 1);
        const y = height - padding - (chartHeight * data.values[i]) / 100;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 添加白色边框
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
        ctx.lineWidth = 3;
    }
}

function updatePredictionData() {
    // 更新当前进度
    const currentProgressElement = document.getElementById('currentProgress');
    if (currentProgressElement) {
        const currentProject = projects.find(p => p.id === currentProjectId);
        if (currentProject) {
            const progress = calculateProjectProgress(currentProject);
            currentProgressElement.textContent = `${Math.round(progress)}%`;
        }
    }
    
    // 更新预测日期
    const predictedDateElement = document.getElementById('predictedDate');
    const completionDateElement = document.getElementById('completionDate');
    
    if (predictedDateElement && completionDateElement) {
        const today = new Date();
        const predicted = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const completion = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
        
        predictedDateElement.textContent = `预计 ${predicted.getMonth() + 1}/${predicted.getDate()}`;
        completionDateElement.textContent = `预计 ${completion.getMonth() + 1}/${completion.getDate()}`;
    }
}

// 在项目切换时更新可视化数据
function updateVisualizationForProject(projectId) {
    if (projectId) {
        setTimeout(() => {
            initializeDataVisualization();
        }, 100);
    }
}

// 全局暴露数据可视化函数
window.initializeDataVisualization = initializeDataVisualization;
window.updateVisualizationForProject = updateVisualizationForProject;

// 获取DOM元素函数
function getDOMElements() {
    // 笔记相关元素
    notesList = document.getElementById('notesList');
    noteView = document.getElementById('noteView');
    noteEditor = document.getElementById('noteEditor');
    welcomeView = document.getElementById('welcomeView');
    noteForm = document.getElementById('noteForm');
    noteTitle = document.getElementById('noteTitle');
    noteContent = document.getElementById('noteContent');
    noteViewTitle = document.getElementById('noteViewTitle');
    noteViewDate = document.getElementById('noteViewDate');
    noteViewContent = document.getElementById('noteViewContent');
    newNoteBtn = document.getElementById('newNoteBtn');
    welcomeNewNoteBtn = document.getElementById('welcomeNewNoteBtn');
    editNoteBtn = document.getElementById('editNoteBtn');
    deleteNoteBtn = document.getElementById('deleteNoteBtn');
    cancelEditBtn = document.getElementById('cancelEditBtn');
    editorTitle = document.getElementById('editorTitle');
    confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    searchInput = document.getElementById('searchInput');

    // 待办列表DOM元素
    todosList = document.getElementById('todosList');
    newTodoInput = document.getElementById('newTodoInput');
    addTodoBtn = document.getElementById('addTodoBtn');

    // AI对话DOM元素
    notesTabBtn = document.getElementById('notesTabBtn');
    aiChatTabBtn = document.getElementById('aiChatTabBtn');
    pomodoroTabBtn = document.getElementById('pomodoroTabBtn');
    projectTabBtn = document.getElementById('projectTabBtn');
    notesPage = document.getElementById('notesPage');
    aiChatPage = document.getElementById('aiChatPage');
    pomodoroPage = document.getElementById('pomodoroPage');
    projectsPage = document.getElementById('projectPage');
    chatMessages_div = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendChatBtn = document.getElementById('sendChatBtn');
    clearChatBtn = document.getElementById('clearChatBtn');

    // 番茄钟 DOM 元素
    timerDisplay = document.getElementById('timerDisplay');
    timerStatus = document.getElementById('timerStatus');
    sessionInfo = document.getElementById('sessionInfo');
    progressCircle = document.getElementById('progressCircle');

    startPauseBtn = document.getElementById('startPauseBtn');
    resetBtn = document.getElementById('resetBtn');

    workTimeInput = document.getElementById('workTimeInput');
    shortBreakInput = document.getElementById('shortBreakInput');
    longBreakInput = document.getElementById('longBreakInput');

    completedPomodoros = document.getElementById('completedPomodoros');
    totalFocusTime = document.getElementById('totalFocusTime');
    dailyProgress = document.getElementById('dailyProgress');
    recentSessions = document.getElementById('recentSessions');

    // 时间调节按钮
    workTimeUp = document.getElementById('workTimeUp');
    workTimeDown = document.getElementById('workTimeDown');
    shortBreakUp = document.getElementById('shortBreakUp');
    shortBreakDown = document.getElementById('shortBreakDown');
    longBreakUp = document.getElementById('longBreakUp');
    longBreakDown = document.getElementById('longBreakDown');

    // 项目管理相关元素
    projectsList = document.getElementById('projectsList');
    projectWelcomeView = document.getElementById('projectWelcomeView');
    projectDetailView = document.getElementById('projectDetailView');
    projectEditForm = document.getElementById('projectEditForm');
    projectForm = document.getElementById('projectForm');
    projectSearchInput = document.getElementById('projectSearchInput');

    // 调试信息：检查关键元素是否成功获取
    console.log('DOM Elements Check:');
    console.log('newNoteBtn:', newNoteBtn);
    console.log('welcomeNewNoteBtn:', welcomeNewNoteBtn);
    console.log('notesTabBtn:', notesTabBtn);
    console.log('aiChatTabBtn:', aiChatTabBtn);
    console.log('pomodoroTabBtn:', pomodoroTabBtn);
    console.log('projectTabBtn:', projectTabBtn);
    console.log('notesPage:', notesPage);
    console.log('aiChatPage:', aiChatPage);
    console.log('pomodoroPage:', pomodoroPage);
    console.log('projectsPage:', projectsPage);
}