/**
 * ChangeTextPlugin - плагин для изменения текста узлов дерева
 * Позволяет редактировать текст узла по нажатию Alt+E
 */
class ChangeTextPlugin {
    constructor() {
        this.core = null;
        this.isEditing = false;
        this.editOverlay = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('ChangeTextPlugin: инициализирован');

        // Регистрация модуля для доступа к функциям редактирования
        core.registerModule('changeText', {
            startEditing: () => this.startEditing(),
            changeNodeText: (nodeId, newText) => this.changeNodeText(nodeId, newText)
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'startEditing') {
                this.startEditing();
            } else if (data.command === 'changeNodeText' && data.nodeId && data.text) {
                this.changeNodeText(data.nodeId, data.text);
            }
        });

        // Добавление обработчика клавиатуры для Alt+E
        this.setupKeyboardShortcut();
        
        // Создание оверлея для редактирования
        this.createEditOverlay();
    }

    /**
     * Настройка обработчика клавиатуры для Alt+E
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Alt+E (код клавиши E - 69)
            if (e.altKey && e.keyCode === 69) {
                e.preventDefault(); // Отменяем стандартное действие браузера
                this.startEditing();
            }
            
            // Escape для отмены редактирования
            if (e.keyCode === 27 && this.isEditing) {
                this.cancelEditing();
            }
        });
    }

    /**
     * Создание оверлея для редактирования
     */
    createEditOverlay() {
        this.editOverlay = document.createElement('div');
        this.editOverlay.className = 'edit-overlay';
        this.editOverlay.style.display = 'none';
        this.editOverlay.innerHTML = `
            <div class="edit-container">
                <div class="edit-header">Редактирование узла</div>
                <input type="text" id="nodeTextInput" class="form-control" placeholder="Введите новый текст">
                <div class="edit-buttons">
                    <button id="saveTextBtn" class="btn btn-primary">Сохранить</button>
                    <button id="cancelTextBtn" class="btn btn-secondary">Отмена</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.editOverlay);
        
        // Добавление стилей для оверлея
        const style = document.createElement('style');
        style.textContent = `
            .edit-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .edit-container {
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                width: 400px;
                max-width: 90%;
            }
            
            .edit-header {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
            }
            
            .edit-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(style);
        
        // Настройка обработчиков событий
        document.getElementById('saveTextBtn').addEventListener('click', () => this.saveEditing());
        document.getElementById('cancelTextBtn').addEventListener('click', () => this.cancelEditing());
        
        // Обработка Enter для сохранения
        document.getElementById('nodeTextInput').addEventListener('keydown', (e) => {
            if (e.keyCode === 13) { // Enter
                this.saveEditing();
            }
        });
    }

    /**
     * Начало редактирования текста активного узла
     */
    startEditing() {
        const activateItem = this.core.getModule('activateItem');
        if (!activateItem) {
            this.core.logger.log('ChangeTextPlugin: не найден модуль activateItem');
            return;
        }
        
        const activeNodeId = activateItem.getActiveNodeId();
        if (!activeNodeId) {
            this.core.logger.log('ChangeTextPlugin: нет активного узла для редактирования');
            return;
        }
        
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('ChangeTextPlugin: не найден модуль treeManager');
            return;
        }
        
        const node = treeManager.findNodeById(activeNodeId);
        if (!node) {
            this.core.logger.log(`ChangeTextPlugin: узел с ID ${activeNodeId} не найден`);
            return;
        }
        
        // Показываем оверлей и заполняем поле текущим текстом
        this.isEditing = true;
        this.editOverlay.style.display = 'flex';
        const input = document.getElementById('nodeTextInput');
        input.value = node.text;
        input.focus();
        input.select();
        
        // Сохраняем ID редактируемого узла
        this.editOverlay.dataset.nodeId = activeNodeId;
        
        this.core.logger.log(`Редактирование узла: ${node.text}`);
    }

    /**
     * Сохранение изменений текста
     */
    saveEditing() {
        if (!this.isEditing) return;
        
        const nodeId = this.editOverlay.dataset.nodeId;
        const newText = document.getElementById('nodeTextInput').value.trim();
        
        if (newText) {
            this.changeNodeText(nodeId, newText);
        }
        
        this.closeEditOverlay();
    }

    /**
     * Отмена редактирования
     */
    cancelEditing() {
        if (!this.isEditing) return;
        this.closeEditOverlay();
        this.core.logger.log('Редактирование отменено');
    }

    /**
     * Закрытие оверлея редактирования
     */
    closeEditOverlay() {
        this.isEditing = false;
        this.editOverlay.style.display = 'none';
        delete this.editOverlay.dataset.nodeId;
    }

    /**
     * Изменение текста узла
     * @param {string} nodeId - ID узла
     * @param {string} newText - новый текст
     */
    changeNodeText(nodeId, newText) {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('ChangeTextPlugin: не найден модуль treeManager');
            return false;
        }
        
        const node = treeManager.findNodeById(nodeId);
        if (!node) {
            this.core.logger.log(`ChangeTextPlugin: узел с ID ${nodeId} не найден`);
            return false;
        }
        
        const oldText = node.text;
        node.text = newText;
        
        // Обновляем отображение дерева
        this.core.logger.log(`Текст узла изменен: "${oldText}" -> "${newText}"`);
        
        // Генерируем событие изменения текста
        this.core.events.emit('nodeTextChanged', { 
            nodeId, 
            oldText, 
            newText 
        });
        
        // Вызываем событие для обновления дерева
        this.core.events.emit('treeUpdated', { nodeId });
        
        // Перерисовываем дерево - более надежный способ
        if (window.treeRenderer) {
            window.treeRenderer.render();
        } else {
            // Альтернативный способ обновления через DOM
            const treeElement = document.getElementById('tree');
            if (treeElement && typeof treeElement.render === 'function') {
                treeElement.render();
            } else {
                // Принудительное обновление через создание нового рендерера
                const treeRenderer = new TreeRenderer('tree');
                treeRenderer.initialize();
                treeRenderer.setupEventListeners();
            }
        }
        
        return true;
    }
}

// Создание экземпляра плагина
const changeTextPlugin = new ChangeTextPlugin();

// Экспорт для использования в других модулях
window.changeTextPlugin = changeTextPlugin;
