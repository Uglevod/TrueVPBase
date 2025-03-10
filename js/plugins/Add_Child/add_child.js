/**
 * Генерация UUID v4
 * @returns {string} строка в формате UUID v4 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * AddChildPlugin - плагин для добавления дочерних элементов к активному узлу
 * Добавляет элементы типа "Def" с текстом "Новый элемент" по нажатию Alt+C
 */
class AddChildPlugin {
    constructor() {
        this.core = null;
        // Удаляем переменную nextId, так как будем использовать UUID
        // this.nextId = 1000; 
    }

    init(core) {
        this.core = core;
        core.logger.log('AddChildPlugin: инициализирован');

        // Регистрация модуля
        core.registerModule('addChild', {
            addChildToNode: (parentId, type, text) => this.addChildToNode(parentId, type, text)
        });

        // Подписка на события
        core.events.on('keydown', (data) => {
            if (data.altKey && data.code === 'KeyC') {
                this.addChildToActiveNode();
            }
        });

        // Обработка команд
        core.events.on('command', (data) => {
            if (data.command === 'addChild') {
                const parentId = data.parentId || (this.core.getModule('activateItem') ? this.core.getModule('activateItem').getActiveNodeId() : null);
                if (parentId) {
                    this.addChildToNode(parentId, data.type || 'Def', data.text || 'Новый элемент', data.activateNew);
                } else {
                    this.core.logger.log('Не указан родительский элемент для добавления дочернего');
                }
            }
        });

        // Добавляем обработчик клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.code === 'KeyC') {
                e.preventDefault();
                this.core.events.emit('keydown', { altKey: true, code: 'KeyC' });
            }
        });
    }

    /**
     * Добавление дочернего элемента к активному узлу
     */
    addChildToActiveNode() {
        const activateItem = this.core.getModule('activateItem');
        if (!activateItem) {
            this.core.logger.log('Модуль активации элементов не найден');
            return;
        }

        const activeNodeId = activateItem.getActiveNodeId();
        if (!activeNodeId) {
            this.core.logger.log('Нет активного элемента для добавления дочернего');
            return;
        }

        this.addChildToNode(activeNodeId, 'Def', 'Новый элемент', true);
    }

    /**
     * Добавление дочернего элемента к указанному узлу
     * @param {string} parentId - ID родительского узла
     * @param {string} type - тип элемента
     * @param {string} text - текст элемента
     * @param {boolean} activateItem - активировать ли новый элемент после добавления
     * @returns {object|null} - новый элемент или null в случае ошибки
     */
    addChildToNode(parentId, type = 'Def', text = 'Новый элемент', activateItem = true) {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('Модуль управления деревом не найден');
            return null;
        }

        const parentNode = treeManager.findNodeById(parentId);
        if (parentNode) {
            // Генерируем UUID для нового элемента
            const newId = generateUUID();
            
            // Создаем новый элемент
            const newElement = {
                id: newId,
                type: type,
                text: text,
                children: []
            };

            // Если у родительского узла нет массива children, создаем его
            if (!parentNode.children) {
                parentNode.children = [];
            }

            // Добавляем новый элемент к дочерним элементам родителя
            parentNode.children.push(newElement);

            this.core.logger.log(`Добавлен дочерний элемент с ID ${newId} к родителю ${parentId}`);
            
            // Вызываем событие обновления дерева
            this.core.events.emit('treeUpdated', { nodeId: newId });
            
            // Активируем новый элемент
            if (activateItem) {
                // Проверяем доступные методы и используем правильный
                const activateItemModule = this.core.getModule('activateItem');
                if (activateItemModule && typeof activateItemModule.activateNode === 'function') {
                    activateItemModule.activateNode(newId);
                } else {
                    this.core.events.emit('activateNode', { nodeId: newId });
                }
            }
            
            // Раскрываем узлы по пути от корня до нового элемента
            if (window.treeRenderer) {
                window.treeRenderer.expandNodeAndParents(parentId);
            }
            
            return newElement;
        } else {
            this.core.logger.log(`Не удалось добавить дочерний элемент к родителю с ID ${parentId}`);
            return null;
        }
    }
}

// Создание экземпляра плагина
const addChildPlugin = new AddChildPlugin();

// Экспорт для использования в других модулях
window.addChildPlugin = addChildPlugin;
