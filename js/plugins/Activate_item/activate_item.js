/**
 * ActivateItemPlugin - плагин для активации элементов дерева по клику
 * Позволяет выделять элементы дерева по левому клику мыши
 */
class ActivateItemPlugin {
    constructor() {
        this.core = null;
        this.activeNodeId = null;
        this.activeNodeElement = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('ActivateItemPlugin: инициализирован');

        // Регистрация модуля для доступа к активному элементу
        core.registerModule('activateItem', {
            getActiveNodeId: () => this.activeNodeId,
            activateNode: (nodeId) => this.activateNodeById(nodeId),
            deactivateAll: () => this.deactivateAll()
        });

        // Добавление обработчиков событий для дерева
        this.setupEventListeners();

        // Добавление стилей для активного элемента
        this.addStyles();

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'activateNode' && data.nodeId) {
                this.activateNodeById(data.nodeId);
            } else if (data.command === 'deactivateAll') {
                this.deactivateAll();
            }
        });
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        const treeContainer = document.getElementById('tree');
        if (!treeContainer) {
            this.core.logger.log('ActivateItemPlugin: не найден контейнер дерева');
            return;
        }

        treeContainer.addEventListener('click', (e) => {
            // Проверяем, что клик был по содержимому узла, а не по кнопке разворачивания
            const nodeContent = e.target.closest('.node-content');
            if (nodeContent && !e.target.closest('.toggle-btn')) {
                const nodeElement = nodeContent.closest('.tree-node');
                if (nodeElement) {
                    const nodeId = nodeElement.getAttribute('data-node-id');
                    this.activateNode(nodeElement, nodeId);
                }
            }
        });

        // Обработка клика вне дерева для снятия выделения
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#tree') && this.activeNodeElement) {
                this.deactivateAll();
            }
        });
    }

    /**
     * Активация узла по элементу DOM и ID
     */
    activateNode(nodeElement, nodeId) {
        // Деактивируем предыдущий активный узел
        this.deactivateAll();

        // Активируем новый узел
        nodeElement.classList.add('active-node');
        this.activeNodeElement = nodeElement;
        this.activeNodeId = nodeId;

        // Получаем данные узла из TreeManager
        const treeManager = this.core.getModule('treeManager');
        if (treeManager) {
            const node = treeManager.findNodeById(nodeId);
            if (node) {
                this.core.logger.log(`Активирован узел: ${node.text} [${node.type}]`);
                
                // Генерируем событие активации узла
                this.core.events.emit('nodeActivated', { 
                    nodeId: nodeId, 
                    node: node 
                });
            }
        }
    }

    /**
     * Активация узла по ID
     */
    activateNodeById(nodeId) {
        const nodeElement = document.querySelector(`.tree-node[data-node-id="${nodeId}"]`);
        if (nodeElement) {
            this.activateNode(nodeElement, nodeId);
            return true;
        }
        return false;
    }

    /**
     * Деактивация всех узлов
     */
    deactivateAll() {
        if (this.activeNodeElement) {
            this.activeNodeElement.classList.remove('active-node');
            this.activeNodeElement = null;
            this.activeNodeId = null;
            
            // Генерируем событие деактивации
            this.core.events.emit('nodeDeactivated', {});
        }
    }

    /**
     * Добавление стилей для активного элемента
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .active-node > .node-content {
                background-color: #e7f3ff;
                border: 1px solid #99c9ff;
                border-radius: 4px;
            }
            
            .active-node > .node-content .node-text {
                font-weight: bold;
            }
            
            .tree-node .node-content {
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .tree-node .node-content:hover {
                background-color: #f0f0f0;
            }
        `;
        document.head.appendChild(style);
    }
}

// Создание экземпляра плагина
const activateItemPlugin = new ActivateItemPlugin();

// Экспорт для использования в других модулях
window.activateItemPlugin = activateItemPlugin;

// Проверим, какие методы экспортирует плагин активации
console.log('Методы плагина активации:', Object.keys(window.activateItemPlugin));
