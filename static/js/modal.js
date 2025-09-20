// 自定义模态框和提示组件管理器
class CustomModal {
    constructor(element) {
        this.element = element;
        this.isOpen = false;
        this.backdrop = null;
        this.init();
    }

    init() {
        // 添加关闭按钮事件监听
        const closeButtons = this.element.querySelectorAll('[data-modal-close]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.hide());
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });
    }

    show() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        
        // 创建背景遮罩
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'fixed inset-0 bg-black/50 z-40';
        this.backdrop.addEventListener('click', () => this.hide());
        document.body.appendChild(this.backdrop);
        
        // 显示模态框
        this.element.classList.remove('hidden');
        this.element.classList.add('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center');
        
        // 禁止页面滚动
        document.body.style.overflow = 'hidden';
        
        // 动画效果
        requestAnimationFrame(() => {
            this.backdrop.style.opacity = '1';
            const content = this.element.querySelector('[data-modal-content]');
            if (content) {
                content.style.transform = 'scale(1)';
                content.style.opacity = '1';
            }
        });
    }

    hide() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        // 动画效果
        if (this.backdrop) {
            this.backdrop.style.opacity = '0';
        }
        
        const content = this.element.querySelector('[data-modal-content]');
        if (content) {
            content.style.transform = 'scale(0.95)';
            content.style.opacity = '0';
        }
        
        // 延迟隐藏
        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.classList.remove('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center');
            
            if (this.backdrop) {
                document.body.removeChild(this.backdrop);
                this.backdrop = null;
            }
            
            // 恢复页面滚动
            document.body.style.overflow = '';
        }, 150);
    }

    static getInstance(element) {
        if (!element._customModal) {
            element._customModal = new CustomModal(element);
        }
        return element._customModal;
    }
}

// 自定义Toast提示组件
class CustomToast {
    constructor(element) {
        this.element = element;
        this.isVisible = false;
        this.timeout = null;
        this.init();
    }

    init() {
        // 添加关闭按钮事件监听
        const closeButton = this.element.querySelector('[data-toast-close]');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }
    }

    show(options = {}) {
        const { duration = 3000 } = options;
        
        if (this.isVisible) return;
        
        this.isVisible = true;
        
        // 显示Toast
        this.element.classList.remove('hidden');
        this.element.style.transform = 'translateX(100%)';
        this.element.style.opacity = '0';
        
        // 动画效果
        requestAnimationFrame(() => {
            this.element.style.transform = 'translateX(0)';
            this.element.style.opacity = '1';
        });
        
        // 自动隐藏
        if (duration > 0) {
            this.timeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        // 动画效果
        this.element.style.transform = 'translateX(100%)';
        this.element.style.opacity = '0';
        
        // 延迟隐藏
        setTimeout(() => {
            this.element.classList.add('hidden');
        }, 300);
    }

    static getInstance(element) {
        if (!element._customToast) {
            element._customToast = new CustomToast(element);
        }
        return element._customToast;
    }
}

// 全局函数
window.CustomModal = CustomModal;
window.CustomToast = CustomToast;

// 兼容Bootstrap API
window.bootstrap = {
    Modal: CustomModal,
    Toast: CustomToast
};