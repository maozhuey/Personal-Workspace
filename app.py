#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, send_from_directory
import os
import datetime
import json
import uuid
import requests
from typing import List, Dict
from dotenv import load_dotenv
import openai

# 加载环境变量
load_dotenv()

app = Flask(__name__, static_folder='static')

class NotebookAPI:
    def __init__(self):
        # 创建笔记存储目录
        self.notes_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "notes")
        if not os.path.exists(self.notes_dir):
            os.makedirs(self.notes_dir)
        
        # 笔记索引文件
        self.index_file = os.path.join(self.notes_dir, "index.json")
        self.notes_index = self.load_index()
    
    def load_index(self):
        """加载笔记索引"""
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return []
        return []
    
    def save_index(self):
        """保存笔记索引"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.notes_index, f, ensure_ascii=False, indent=2)
    
    def create_note(self, title, content):
        """创建新笔记"""
        # 生成笔记ID和时间戳
        timestamp = datetime.datetime.now()
        note_id = str(uuid.uuid4())
        
        # 创建笔记文件
        note_filename = f"{note_id}.txt"
        note_path = os.path.join(self.notes_dir, note_filename)
        
        # 写入笔记内容
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 更新索引
        note_info = {
            'id': note_id,
            'title': title,
            'filename': note_filename,
            'created_at': timestamp.isoformat(),
            'updated_at': timestamp.isoformat()
        }
        
        self.notes_index.append(note_info)
        self.save_index()
        
        return note_info
    
    def list_notes(self):
        """列出所有笔记"""
        return sorted(self.notes_index, key=lambda x: x["created_at"], reverse=True)
    
    def get_note(self, note_id):
        """获取指定笔记内容"""
        for note in self.notes_index:
            if note["id"] == note_id:
                note_path = os.path.join(self.notes_dir, note["filename"])
                if os.path.exists(note_path):
                    with open(note_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    return {**note, "content": content}
        return None
    
    def update_note(self, note_id, title, content):
        """更新笔记"""
        for i, note in enumerate(self.notes_index):
            if note["id"] == note_id:
                # 更新笔记内容
                note_path = os.path.join(self.notes_dir, note["filename"])
                if os.path.exists(note_path):
                    with open(note_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    # 更新索引
                    self.notes_index[i]["title"] = title
                    self.notes_index[i]["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    self.save_index()
                    return self.notes_index[i]
        return None
    
    def delete_note(self, note_id):
        """删除笔记"""
        for i, note in enumerate(self.notes_index):
            if note["id"] == note_id:
                # 删除笔记文件
                note_path = os.path.join(self.notes_dir, note["filename"])
                if os.path.exists(note_path):
                    os.remove(note_path)
                
                # 更新索引
                deleted_note = self.notes_index.pop(i)
                self.save_index()
                return deleted_note
        return None

class TodoAPI:
    def __init__(self):
        # 创建待办存储目录
        self.todos_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "todos")
        if not os.path.exists(self.todos_dir):
            os.makedirs(self.todos_dir)
        
        # 待办索引文件
        self.index_file = os.path.join(self.todos_dir, "todos.json")
        self.todos_index = self.load_index()
        
        # 如果没有待办事项，创建默认示例数据
        if not self.todos_index:
            self.create_default_todos()
    
    def load_index(self):
        """加载待办索引"""
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return []
        return []
    
    def save_index(self):
        """保存待办索引"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.todos_index, f, ensure_ascii=False, indent=2)
    
    def create_default_todos(self):
        """创建默认待办示例数据"""
        default_todos = [
            {"title": "完成项目文档", "completed": False},
            {"title": "学习新技术", "completed": False},
            {"title": "整理代码库", "completed": True},
            {"title": "准备会议材料", "completed": False},
            {"title": "回复重要邮件", "completed": True}
        ]
        
        for todo_data in default_todos:
            self.create_todo(todo_data["title"], todo_data["completed"])
    
    def create_todo(self, title, completed=False):
        """创建新待办"""
        timestamp = datetime.datetime.now()
        todo_id = str(uuid.uuid4())
        
        todo_info = {
            "id": todo_id,
            "title": title,
            "completed": completed,
            "created_at": timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if completed:
            todo_info["completed_at"] = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
        self.todos_index.append(todo_info)
        self.save_index()
        
        return todo_info
    
    def list_todos(self):
        """列出所有待办"""
        return sorted(self.todos_index, key=lambda x: x["created_at"], reverse=True)
    
    def update_todo(self, todo_id, title=None, completed=None):
        """更新待办"""
        for i, todo in enumerate(self.todos_index):
            if todo["id"] == todo_id:
                if title is not None:
                    self.todos_index[i]["title"] = title
                
                if completed is not None:
                    self.todos_index[i]["completed"] = completed
                    if completed:
                        self.todos_index[i]["completed_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    else:
                        self.todos_index[i].pop("completed_at", None)
                
                self.todos_index[i]["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.save_index()
                return self.todos_index[i]
        return None
    
    def delete_todo(self, todo_id):
        """删除待办"""
        for i, todo in enumerate(self.todos_index):
            if todo["id"] == todo_id:
                deleted_todo = self.todos_index.pop(i)
                self.save_index()
                return deleted_todo
        return None

class ProjectAPI:
    def __init__(self):
        # 创建项目存储目录
        self.projects_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "projects")
        if not os.path.exists(self.projects_dir):
            os.makedirs(self.projects_dir)
        
        # 项目索引文件
        self.index_file = os.path.join(self.projects_dir, "projects.json")
        self.projects_index = self.load_index()
        
        # 任务存储目录
        self.tasks_dir = os.path.join(self.projects_dir, "tasks")
        if not os.path.exists(self.tasks_dir):
            os.makedirs(self.tasks_dir)
    
    def load_index(self):
        """加载项目索引"""
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return []
        return []
    
    def save_index(self):
        """保存项目索引"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.projects_index, f, ensure_ascii=False, indent=2)
    
    def create_project(self, name, description="", status="active"):
        """创建新项目"""
        timestamp = datetime.datetime.now()
        project_id = str(uuid.uuid4())
        
        project_info = {
            "id": project_id,
            "name": name,
            "description": description,
            "status": status,
            "created_at": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "progress": 0
        }
        
        self.projects_index.append(project_info)
        self.save_index()
        
        # 创建项目任务文件
        tasks_file = os.path.join(self.tasks_dir, f"{project_id}.json")
        with open(tasks_file, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        
        return project_info
    
    def list_projects(self):
        """列出所有项目"""
        return sorted(self.projects_index, key=lambda x: x["created_at"], reverse=True)
    
    def get_project(self, project_id):
        """获取指定项目"""
        for project in self.projects_index:
            if project["id"] == project_id:
                return project
        return None
    
    def update_project(self, project_id, name=None, description=None, status=None):
        """更新项目"""
        for i, project in enumerate(self.projects_index):
            if project["id"] == project_id:
                if name is not None:
                    self.projects_index[i]["name"] = name
                if description is not None:
                    self.projects_index[i]["description"] = description
                if status is not None:
                    self.projects_index[i]["status"] = status
                
                self.projects_index[i]["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.save_index()
                return self.projects_index[i]
        return None
    
    def delete_project(self, project_id):
        """删除项目"""
        for i, project in enumerate(self.projects_index):
            if project["id"] == project_id:
                # 删除项目任务文件
                tasks_file = os.path.join(self.tasks_dir, f"{project_id}.json")
                if os.path.exists(tasks_file):
                    os.remove(tasks_file)
                
                # 更新索引
                deleted_project = self.projects_index.pop(i)
                self.save_index()
                return deleted_project
        return None
    
    def get_project_tasks(self, project_id):
        """获取项目任务列表"""
        tasks_file = os.path.join(self.tasks_dir, f"{project_id}.json")
        if os.path.exists(tasks_file):
            try:
                with open(tasks_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return []
        return []
    
    def save_project_tasks(self, project_id, tasks):
        """保存项目任务列表"""
        tasks_file = os.path.join(self.tasks_dir, f"{project_id}.json")
        with open(tasks_file, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)
        
        # 更新项目进度
        self.update_project_progress(project_id)
    
    def create_task(self, project_id, title, description="", status="pending", priority="medium", due_date=None):
        """创建新任务"""
        timestamp = datetime.datetime.now()
        task_id = str(uuid.uuid4())
        
        task_info = {
            "id": task_id,
            "project_id": project_id,
            "title": title,
            "description": description,
            "status": status,
            "priority": priority,
            "due_date": due_date,
            "created_at": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if status == "completed":
            task_info["completed_at"] = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
        tasks = self.get_project_tasks(project_id)
        tasks.append(task_info)
        self.save_project_tasks(project_id, tasks)
        
        return task_info
    
    def update_task(self, project_id, task_id, title=None, description=None, status=None, priority=None, due_date=None):
        """更新任务"""
        tasks = self.get_project_tasks(project_id)
        
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                if title is not None:
                    tasks[i]["title"] = title
                if description is not None:
                    tasks[i]["description"] = description
                if status is not None:
                    old_status = tasks[i]["status"]
                    tasks[i]["status"] = status
                    
                    # 处理完成状态变化
                    if status == "completed" and old_status != "completed":
                        tasks[i]["completed_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    elif status != "completed":
                        tasks[i].pop("completed_at", None)
                
                if priority is not None:
                    tasks[i]["priority"] = priority
                if due_date is not None:
                    tasks[i]["due_date"] = due_date
                
                tasks[i]["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.save_project_tasks(project_id, tasks)
                return tasks[i]
        return None
    
    def delete_task(self, project_id, task_id):
        """删除任务"""
        tasks = self.get_project_tasks(project_id)
        
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                deleted_task = tasks.pop(i)
                self.save_project_tasks(project_id, tasks)
                return deleted_task
        return None
    
    def update_project_progress(self, project_id):
        """更新项目进度"""
        tasks = self.get_project_tasks(project_id)
        if not tasks:
            progress = 0
        else:
            completed_tasks = len([task for task in tasks if task["status"] == "completed"])
            progress = int((completed_tasks / len(tasks)) * 100)
        
        for i, project in enumerate(self.projects_index):
            if project["id"] == project_id:
                self.projects_index[i]["progress"] = progress
                self.save_index()
                break
        
        return progress

class ChatAPI:
    def __init__(self):
        # 创建聊天记录存储目录
        self.chat_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chats")
        if not os.path.exists(self.chat_dir):
            os.makedirs(self.chat_dir)
        
        # 聊天记录文件
        self.chat_file = os.path.join(self.chat_dir, "chat_history.json")
        self.chat_history = self.load_chat_history()
        
        # AI服务配置（这里使用模拟回复，实际使用时需要配置真实的AI服务）
        self.ai_service_enabled = False
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if self.openai_api_key:
            self.ai_service_enabled = True
    
    def load_chat_history(self):
        """加载聊天历史"""
        if os.path.exists(self.chat_file):
            try:
                with open(self.chat_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return []
        return []
    
    def save_chat_history(self):
        """保存聊天历史"""
        with open(self.chat_file, 'w', encoding='utf-8') as f:
            json.dump(self.chat_history, f, ensure_ascii=False, indent=2)
    
    def add_message(self, role: str, content: str):
        """添加消息到历史记录"""
        message = {
            'id': str(uuid.uuid4()),
            'role': role,
            'content': content,
            'timestamp': datetime.datetime.now().isoformat()
        }
        self.chat_history.append(message)
        self.save_chat_history()
        return message
    
    def get_ai_response(self, user_message: str, history: List[Dict] = None) -> str:
        """获取AI回复"""
        if self.ai_service_enabled:
            try:
                return self._call_openai_api(user_message, history)
            except Exception as e:
                print(f"AI服务调用失败: {e}")
                return self._get_fallback_response(user_message)
        else:
            return self._get_fallback_response(user_message)
    
    def _call_openai_api(self, user_message: str, history: List[Dict] = None) -> str:
        """调用OpenAI API"""
        # 构建消息历史
        messages = []
        if history:
            for msg in history[-5:]:  # 只取最近5条消息作为上下文
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
        
        messages.append({"role": "user", "content": user_message})
        
        # 调用OpenAI API
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            raise Exception(f"API调用失败: {response.status_code}")
    
    def _get_fallback_response(self, user_message: str) -> str:
        """获取备用回复（当AI服务不可用时）"""
        # 简单的关键词匹配回复
        message_lower = user_message.lower()
        
        if any(word in message_lower for word in ['你好', 'hello', 'hi', '您好']):
            return "您好！我是您的AI助手，很高兴为您服务。有什么可以帮助您的吗？"
        elif any(word in message_lower for word in ['谢谢', 'thank', '感谢']):
            return "不客气！如果您还有其他问题，随时可以问我。"
        elif any(word in message_lower for word in ['再见', 'bye', '拜拜']):
            return "再见！祝您生活愉快，有需要随时找我聊天。"
        elif any(word in message_lower for word in ['笔记', 'note', '记录']):
            return "我可以帮您管理笔记！您可以在笔记页面创建、编辑和删除笔记。有什么具体的笔记需求吗？"
        elif any(word in message_lower for word in ['待办', 'todo', '任务']):
            return "我注意到您提到了待办事项。您可以在待办列表中添加、完成和删除任务。需要我帮您规划什么任务吗？"
        elif any(word in message_lower for word in ['时间', 'time', '日期']):
            current_time = datetime.datetime.now().strftime("%Y年%m月%d日 %H:%M:%S")
            return f"现在的时间是：{current_time}"
        elif '?' in user_message or '？' in user_message:
            return "这是一个很好的问题！不过我目前的功能还比较有限，主要可以帮您管理笔记和待办事项。您可以尝试问我一些关于笔记管理的问题。"
        else:
            return "我理解您的意思。作为您的个人助手，我主要可以帮您管理笔记和待办事项。如果您需要其他帮助，请告诉我具体需求！"
    
    def clear_history(self):
        """清空聊天历史"""
        self.chat_history = []
        self.save_chat_history()

# 创建API实例
notebook_api = NotebookAPI()
todo_api = TodoAPI()
chat_api = ChatAPI()
project_api = ProjectAPI()

# API路由
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    notes = notebook_api.list_notes()
    return jsonify(notes)

@app.route('/api/notes', methods=['POST'])
def create_note():
    data = request.json
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({"error": "标题和内容不能为空"}), 400
    
    note = notebook_api.create_note(data['title'], data['content'])
    return jsonify(note), 201

@app.route('/api/notes/<note_id>', methods=['GET'])
def get_note(note_id):
    note = notebook_api.get_note(note_id)
    if note:
        return jsonify(note)
    return jsonify({"error": "笔记不存在"}), 404

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.json
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({"error": "标题和内容不能为空"}), 400
    
    note = notebook_api.update_note(note_id, data['title'], data['content'])
    if note:
        return jsonify(note)
    return jsonify({"error": "笔记不存在"}), 404

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = notebook_api.delete_note(note_id)
    if note:
        return jsonify({"message": "笔记已删除"})
    return jsonify({"error": "笔记不存在"}), 404

# 待办列表API路由
@app.route('/api/todos', methods=['GET'])
def get_todos():
    todos = todo_api.list_todos()
    return jsonify(todos)

@app.route('/api/todos', methods=['POST'])
def create_todo():
    data = request.json
    if not data or 'title' not in data:
        return jsonify({"error": "待办标题不能为空"}), 400
    
    todo = todo_api.create_todo(data['title'], data.get('completed', False))
    return jsonify(todo), 201

@app.route('/api/todos/<todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = request.json
    if not data:
        return jsonify({"error": "请提供更新数据"}), 400
    
    todo = todo_api.update_todo(
        todo_id, 
        title=data.get('title'), 
        completed=data.get('completed')
    )
    if todo:
        return jsonify(todo)
    return jsonify({"error": "待办不存在"}), 404

@app.route('/api/todos/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo = todo_api.delete_todo(todo_id)
    if todo:
        return jsonify({"message": "待办已删除"})
    return jsonify({"error": "待办不存在"}), 404

# AI对话API路由
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': '消息不能为空'}), 400
        
        # 添加用户消息到历史记录
        chat_api.add_message('user', user_message)
        
        # 获取AI回复
        ai_reply = chat_api.get_ai_response(user_message, history)
        
        # 添加AI回复到历史记录
        chat_api.add_message('assistant', ai_reply)
        
        return jsonify({
            'reply': ai_reply,
            'timestamp': datetime.datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f"聊天API错误: {e}")
        return jsonify({'error': '服务器内部错误'}), 500

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """获取聊天历史"""
    try:
        return jsonify(chat_api.chat_history)
    except Exception as e:
        print(f"获取聊天历史错误: {e}")
        return jsonify({'error': '服务器内部错误'}), 500

@app.route('/api/chat/clear', methods=['DELETE'])
def clear_chat_history():
    """清空聊天历史"""
    try:
        chat_api.clear_history()
        return jsonify({'message': '聊天历史已清空'})
    except Exception as e:
        print(f"清空聊天历史错误: {e}")
        return jsonify({'error': '服务器内部错误'}), 500

# 项目管理相关API
@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = project_api.list_projects()
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    name = data.get('name', '')
    description = data.get('description', '')
    status = data.get('status', 'active')
    
    if not name:
        return jsonify({'error': '项目名称不能为空'}), 400
    
    project = project_api.create_project(name, description, status)
    return jsonify(project), 201

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    project = project_api.get_project(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    return jsonify(project)

@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    status = data.get('status')
    
    project = project_api.update_project(project_id, name, description, status)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    return jsonify(project)

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = project_api.delete_project(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    return jsonify({'message': '项目已删除'})

# 项目任务相关API
@app.route('/api/projects/<project_id>/tasks', methods=['GET'])
def get_project_tasks(project_id):
    # 检查项目是否存在
    project = project_api.get_project(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    tasks = project_api.get_project_tasks(project_id)
    return jsonify(tasks)

@app.route('/api/projects/<project_id>/tasks', methods=['POST'])
def create_task(project_id):
    # 检查项目是否存在
    project = project_api.get_project(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    data = request.get_json()
    title = data.get('title', '')
    description = data.get('description', '')
    status = data.get('status', 'pending')
    priority = data.get('priority', 'medium')
    due_date = data.get('due_date')
    
    if not title:
        return jsonify({'error': '任务标题不能为空'}), 400
    
    task = project_api.create_task(project_id, title, description, status, priority, due_date)
    return jsonify(task), 201

@app.route('/api/projects/<project_id>/tasks/<task_id>', methods=['PUT'])
def update_task(project_id, task_id):
    # 检查项目是否存在
    project = project_api.get_project(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    status = data.get('status')
    priority = data.get('priority')
    due_date = data.get('due_date')
    
    task = project_api.update_task(project_id, task_id, title, description, status, priority, due_date)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    
    return jsonify(task)

@app.route('/api/projects/<project_id>/tasks/<task_id>', methods=['DELETE'])
def delete_task(project_id, task_id):
    # 检查项目是否存在
    project = project_api.get_project(project_id)
    if not project:
        return jsonify({'error': '项目不存在'}), 404
    
    task = project_api.delete_task(project_id, task_id)
    if not task:
        return jsonify({'error': '任务不存在'}), 404
    
    return jsonify({'message': '任务已删除'})

@app.route('/debug')
def debug_page():
    return '''
    <!DOCTYPE html>
    <html>
    <head><title>Debug</title></head>
    <body>
        <h1>Debug Page</h1>
        <button onclick="console.log('Button clicked')">Test Button</button>
        <script>
            console.log('Debug page loaded');
            // 检查主页面的元素
            fetch('/').then(r => r.text()).then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                console.log('newNoteBtn exists:', !!doc.getElementById('newNoteBtn'));
                console.log('notesTabBtn exists:', !!doc.getElementById('notesTabBtn'));
            });
        </script>
    </body>
    </html>
    '''

# 模块底部
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8082))
    app.run(debug=True, host='0.0.0.0', port=port)