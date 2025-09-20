#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import datetime
import json
import sys

class Notebook:
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
        note_id = timestamp.strftime("%Y%m%d%H%M%S")
        
        # 创建笔记文件
        note_filename = f"{note_id}.txt"
        note_path = os.path.join(self.notes_dir, note_filename)
        
        # 写入笔记内容
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 更新索引
        note_info = {
            "id": note_id,
            "title": title,
            "created_at": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "filename": note_filename
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

def print_menu():
    """打印主菜单"""
    print("\n个人记事本")
    print("=" * 30)
    print("1. 新建笔记")
    print("2. 查看笔记列表")
    print("3. 查看笔记内容")
    print("0. 退出")
    print("=" * 30)

def main():
    notebook = Notebook()
    
    while True:
        print_menu()
        choice = input("请选择操作 [0-3]: ")
        
        if choice == "1":
            # 新建笔记
            print("\n新建笔记")
            title = input("请输入笔记标题: ")
            print("请输入笔记内容 (输入空行结束):\n")
            lines = []
            while True:
                line = input()
                if line.strip() == "":
                    break
                lines.append(line)
            content = "\n".join(lines)
            
            note = notebook.create_note(title, content)
            print(f"\n笔记已保存! ID: {note['id']}")
        
        elif choice == "2":
            # 查看笔记列表
            notes = notebook.list_notes()
            print("\n笔记列表:")
            print("-" * 60)
            if not notes:
                print("暂无笔记")
            else:
                print(f"{'ID':<15} {'创建时间':<20} {'标题'}")
                print("-" * 60)
                for note in notes:
                    print(f"{note['id']:<15} {note['created_at']:<20} {note['title']}")
            print("-" * 60)
        
        elif choice == "3":
            # 查看笔记内容
            note_id = input("请输入要查看的笔记ID: ")
            note = notebook.get_note(note_id)
            if note:
                print("\n" + "-" * 60)
                print(f"标题: {note['title']}")
                print(f"创建时间: {note['created_at']}")
                print("-" * 60)
                print(note['content'])
                print("-" * 60)
            else:
                print("未找到该笔记!")
        
        elif choice == "0":
            # 退出
            print("感谢使用个人记事本!")
            break
        
        else:
            print("无效的选择，请重新输入!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n程序已中断，感谢使用!")
    except Exception as e:
        print(f"发生错误: {e}")