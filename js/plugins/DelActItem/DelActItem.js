/**
 * DelActItemPlugin - плагин для удаления активного элемента
 * Позволяет удалять выбранный узел по нажатию Alt+D
 */
class DelActItemPlugin {
    constructor() {
        this.core = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('DelActItemPlugin: инициализирован');

        // Регистрация модуля
        core.registerModule('delActItem', {
            deleteActiveNode: () => this.deleteActiveNode(),
            confirmAndDeleteNode: (nodeId) => this.confirmAndDeleteNode(nodeId)
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'deleteActiveNode') {
                this.deleteActiveNode();
            } else if (data.command === 'deleteNode' && data.nodeId) {
                this.confirmAndDeleteNode(data.nodeId);
            }
        });

        // Добавление пункта в меню
        this.addMenuItemToInterface();
        
        // Настройка горячих клавиш
        this.setupKeyboardShortcut();
    }

    /**
     * Добавление пункта в контекстное меню и меню Инструменты
     */
    addMenuItemToInterface() {
        // Добавляем пункт в выпадающее меню Инструменты
        const toolsDropdown = document.querySelector('#navbarDropdown');
        if (toolsDropdown) {
            const dropdownMenu = toolsDropdown.nextElementSibling;
            if (dropdownMenu) {
                const menuItem = document.createElement('li');
                menuItem.innerHTML = '<a class="dropdown-item" href="#" onclick="coreApi.getModule(\'delActItem\').deleteActiveNode()">Удалить активный элемент</a>';
                
                dropdownMenu.appendChild(menuItem);
            }
        }
        
        // Регистрируем действие в контекстном меню, если оно существует
        const contextMenu = this.core.getModule('contextMenu');
        if (contextMenu) {
            contextMenu.addMenuItem('all', {
                id: 'deleteNode',
                text: 'Удалить',
                action: (nodeId) => {
                    this.confirmAndDeleteNode(nodeId);
                }
            });
        }
    }

    /**
     * Настройка обработчика клавиатуры для Alt+D
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Alt+D (код клавиши D - 68)
            if (e.altKey && e.keyCode === 68) {
                e.preventDefault(); // Отменяем стандартное действие браузера
                this.deleteActiveNode(); // Удаляем активный элемент
            }
        });
    }

    /**
     * Получение активного узла
     * @returns {Object|null} - активный узел или null, если активный узел не найден
     */
    getActiveNode() {
        const activateItem = this.core.getModule('activateItem');
        if (!activateItem) {
            this.core.logger.log('DelActItemPlugin: не найден модуль activateItem');
            return null;
        }
        
        const activeNodeId = activateItem.getActiveNodeId();
        if (!activeNodeId) {
            this.core.logger.log('DelActItemPlugin: нет активного узла');
            return null;
        }
        
        return this.findNodeById(activeNodeId);
    }

    /**
     * Поиск узла по ID
     * @param {string} nodeId - ID узла
     * @returns {Object|null} - найденный узел или null
     */
    findNodeById(nodeId) {
        // Выводим отладочную информацию
        console.log(`DelActItemPlugin: ищем узел с ID ${nodeId}`);
        
        // Сначала пробуем через treeManager
        const treeManager = this.core.getModule('treeManager');
        if (treeManager && typeof treeManager.findNodeById === 'function') {
            console.log('DelActItemPlugin: используем treeManager.findNodeById');
            const node = treeManager.findNodeById(nodeId);
            if (node) {
                console.log(`DelActItemPlugin: узел найден через treeManager`);
                return node;
            }
        }
        
        // Проверяем наличие глобальной переменной treeData
        if (typeof window.treeData === 'undefined') {
            console.log('DelActItemPlugin: window.treeData не определена');
            
            // Пробуем получить данные дерева через рендерер
            if (window.treeRenderer && window.treeRenderer.getTreeData) {
                console.log('DelActItemPlugin: пробуем получить данные через treeRenderer.getTreeData');
                const treeData = window.treeRenderer.getTreeData();
                if (treeData) {
                    console.log('DelActItemPlugin: данные получены через treeRenderer');
                    
                    // Инициализируем window.treeData, если она не была определена
                    window.treeData = treeData;
                    
                    // Продолжаем поиск узла в полученных данных
                    const findNode = (node) => {
                        if (node.id === nodeId) return node;
                        
                        if (node.children && Array.isArray(node.children)) {
                            for (const child of node.children) {
                                const found = findNode(child);
                                if (found) return found;
                            }
                        }
                        
                        return null;
                    };
                    
                    return findNode(treeData);
                }
            }
            
            console.log('DelActItemPlugin: не удалось получить данные дерева');
            return null;
        }
        
        // Если предыдущие методы не сработали, ищем в глобальном дереве
        console.log('DelActItemPlugin: ищем в window.treeData');
        const findNode = (node) => {
            if (!node) return null;
            
            if (node.id === nodeId) return node;
            
            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                    const found = findNode(child);
                    if (found) return found;
                }
            }
            
            return null;
        };
        
        const node = findNode(window.treeData);
        console.log(node ? 'DelActItemPlugin: узел найден в дереве' : 'DelActItemPlugin: узел не найден в дереве');
        return node;
    }

    /**
     * Поиск родительского узла
     * @param {string} nodeId - ID узла, для которого ищем родителя
     * @returns {Object|null} - родительский узел или null
     */
    findParentNode(nodeId) {
        // Выводим отладочную информацию
        console.log(`DelActItemPlugin: ищем родителя для узла с ID ${nodeId}`);
        
        // Сначала пробуем через treeManager
        const treeManager = this.core.getModule('treeManager');
        if (treeManager && typeof treeManager.findParentNode === 'function') {
            console.log('DelActItemPlugin: используем treeManager.findParentNode');
            const parent = treeManager.findParentNode(nodeId);
            if (parent) {
                console.log(`DelActItemPlugin: найден родитель через treeManager: ${parent.id}`);
                return parent;
            }
        }
        
        // Проверяем наличие глобальной переменной treeData
        if (typeof window.treeData === 'undefined') {
            console.log('DelActItemPlugin: window.treeData не определена');
            
            // Пробуем получить данные дерева через рендерер или другие модули
            if (window.treeRenderer && window.treeRenderer.getTreeData) {
                console.log('DelActItemPlugin: пробуем получить данные через treeRenderer.getTreeData');
                const treeData = window.treeRenderer.getTreeData();
                if (treeData) {
                    console.log('DelActItemPlugin: данные получены через treeRenderer');
                    window.treeData = treeData;
                }
            } else {
                console.error('DelActItemPlugin: не удалось получить данные дерева. Удаление невозможно.');
                return null;
            }
        }
        
        // Если treeData всё ещё не определена, выходим с ошибкой
        if (!window.treeData) {
            console.error('DelActItemPlugin: window.treeData не определена даже после попытки получения');
            return null;
        }
        
        // Проверяем, является ли узел корневым (у которого нет родителя)
        if (window.treeData.id === nodeId) {
            console.log('DelActItemPlugin: узел является корневым и не имеет родителя');
            return null;
        }
        
        // Проверяем, является ли узел прямым дочерним для корня
        if (window.treeData.children && Array.isArray(window.treeData.children)) {
            const isDirectChild = window.treeData.children.some(child => child.id === nodeId);
            if (isDirectChild) {
                console.log('DelActItemPlugin: узел является прямым дочерним для корня');
                return window.treeData;
            }
        } else {
            // Если у корня нет детей, создаем пустой массив
            window.treeData.children = [];
        }
        
        // Рекурсивный поиск по дереву
        const findParent = (node, targetId) => {
            if (!node || !node.children) {
                return null;
            }
            
            // Преобразуем в массив, если дети есть, но не в массиве
            if (!Array.isArray(node.children) && node.children) {
                node.children = [node.children];
            }
            
            // Проверяем прямых потомков текущего узла
            if (Array.isArray(node.children)) {
                for (const child of node.children) {
                    if (child && child.id === targetId) {
                        return node;
                    }
                }
                
                // Рекурсивно проверяем в дочерних узлах
                for (const child of node.children) {
                    const found = findParent(child, targetId);
                    if (found) {
                        return found;
                    }
                }
            }
            
            return null;
        };
        
        const parent = findParent(window.treeData, nodeId);
        console.log(parent ? `DelActItemPlugin: найден родитель через рекурсивный поиск: ${parent.id}` : 'DelActItemPlugin: родитель не найден через рекурсивный поиск');
        
        return parent;
    }

    /**
     * Инициализация данных дерева
     * @returns {Object|null} - данные дерева или null, если не удалось получить
     */
    initTreeData() {
        console.log('DelActItemPlugin: пытаемся инициализировать данные дерева');
        
        // Проверяем, есть ли уже данные
        if (window.treeData) {
            console.log('DelActItemPlugin: window.treeData уже существует');
            return window.treeData;
        }
        
        // Стратегия 1: Попробуем получить через treeManager
        const treeManager = this.core.getModule('treeManager');
        if (treeManager) {
            console.log('DelActItemPlugin: пробуем получить данные через treeManager');
            
            // Проверяем разные возможные методы и свойства
            if (treeManager.getTreeData && typeof treeManager.getTreeData === 'function') {
                const treeData = treeManager.getTreeData();
                if (treeData) {
                    console.log('DelActItemPlugin: получены данные через treeManager.getTreeData()');
                    window.treeData = treeData;
                    return treeData;
                }
            }
            
            // Проверяем свойство _treeData или treeData
            if (treeManager._treeData) {
                console.log('DelActItemPlugin: получены данные из treeManager._treeData');
                window.treeData = treeManager._treeData;
                return treeManager._treeData;
            }
            
            if (treeManager.treeData) {
                console.log('DelActItemPlugin: получены данные из treeManager.treeData');
                window.treeData = treeManager.treeData;
                return treeManager.treeData;
            }
        }
        
        // Стратегия 2: Попробуем получить через рендерер
        if (window.treeRenderer) {
            console.log('DelActItemPlugin: пробуем получить данные через treeRenderer');
            
            if (window.treeRenderer.getTreeData && typeof window.treeRenderer.getTreeData === 'function') {
                const treeData = window.treeRenderer.getTreeData();
                if (treeData) {
                    console.log('DelActItemPlugin: получены данные через treeRenderer.getTreeData()');
                    window.treeData = treeData;
                    return treeData;
                }
            }
            
            // Проверяем свойства рендерера
            if (window.treeRenderer.treeData) {
                console.log('DelActItemPlugin: получены данные из treeRenderer.treeData');
                window.treeData = window.treeRenderer.treeData;
                return window.treeRenderer.treeData;
            }
        }
        
        // Стратегия 3: Попробуем получить из DOM-структуры
        console.log('DelActItemPlugin: пробуем восстановить данные из DOM-структуры');
        try {
            const treeElement = document.getElementById('tree');
            if (treeElement) {
                // Проверяем, есть ли у элемента дерева атрибут data-tree
                const treeDataAttr = treeElement.getAttribute('data-tree');
                if (treeDataAttr) {
                    try {
                        const treeData = JSON.parse(treeDataAttr);
                        console.log('DelActItemPlugin: получены данные из атрибута data-tree');
                        window.treeData = treeData;
                        return treeData;
                    } catch (e) {
                        console.error('DelActItemPlugin: ошибка парсинга data-tree', e);
                    }
                }
            }
        } catch (e) {
            console.error('DelActItemPlugin: ошибка при попытке получить данные из DOM', e);
        }
        
        // Стратегия 4: Проверяем другие известные глобальные переменные
        console.log('DelActItemPlugin: проверяем другие глобальные переменные');
        const possibleVars = ['tree', 'treeStructure', 'treeNodes', 'data'];
        for (const varName of possibleVars) {
            if (window[varName] && typeof window[varName] === 'object') {
                console.log(`DelActItemPlugin: найдена переменная window.${varName}`);
                window.treeData = window[varName];
                return window[varName];
            }
        }
        
        // Если всё-таки не удалось получить данные, создаем минимальную структуру
        console.log('DelActItemPlugin: создаем пустую структуру дерева');
        const emptyTree = {
            id: 'root',
            type: 'root',
            text: 'Корень дерева',
            children: []
        };
        window.treeData = emptyTree;
        
        // Пытаемся обновить отображение
        if (window.treeRenderer && window.treeRenderer.render) {
            window.treeRenderer.render();
        }
        
        return emptyTree;
    }

    /**
     * Удаление узла из дерева
     * @param {string} nodeId - ID узла для удаления
     * @returns {boolean} - успешность операции
     */
    deleteNode(nodeId) {
        console.log(`DelActItemPlugin: начинаем удаление узла ${nodeId}`);
        
        try {
            // Проверяем, доступна ли структура дерева
            if (!window.treeData) {
                console.error('DelActItemPlugin: структура дерева недоступна');
                
                // Инициализируем данные дерева
                const treeData = this.initTreeData();
                if (!treeData) {
                    alert('Не удалось получить доступ к структуре дерева. Удаление невозможно.');
                    return false;
                }
                console.log('DelActItemPlugin: структура дерева инициализирована');
            }
            
            // Проверяем, не пытаемся ли мы удалить корневой узел
            if (window.treeData && window.treeData.id === nodeId) {
                this.core.logger.log('DelActItemPlugin: нельзя удалить корневой узел');
                alert('Нельзя удалить корневой узел дерева');
                return false;
            }
            
            // Находим родительский узел
            const parentNode = this.findParentNode(nodeId);
            if (!parentNode) {
                this.core.logger.log(`DelActItemPlugin: не найден родитель для узла ${nodeId}`);
                alert(`Не удалось найти родительский элемент для узла ${nodeId}`);
                return false;
            }
            
            console.log(`DelActItemPlugin: найден родительский узел с ID ${parentNode.id}`);
            
            // Убеждаемся, что у родителя есть массив children
            if (!parentNode.children) {
                parentNode.children = [];
            }
            
            // Преобразуем в массив, если дети есть, но не в массиве
            if (!Array.isArray(parentNode.children) && parentNode.children) {
                parentNode.children = [parentNode.children];
            }
            
            // Находим индекс удаляемого элемента в массиве дочерних элементов родителя
            const childIndex = parentNode.children.findIndex(child => child && child.id === nodeId);
            if (childIndex === -1) {
                this.core.logger.log(`DelActItemPlugin: узел ${nodeId} не найден среди дочерних элементов родителя`);
                console.error(`Дочерние элементы родителя:`, parentNode.children);
                alert(`Узел не найден среди дочерних элементов родителя`);
                return false;
            }
            
            console.log(`DelActItemPlugin: найден индекс ${childIndex} в массиве дочерних элементов`);
            
            // Запоминаем соседний узел для дальнейшей активации
            let nextActiveNodeId = null;
            if (childIndex > 0) {
                // Если есть предыдущий узел, активируем его
                nextActiveNodeId = parentNode.children[childIndex - 1].id;
            } else if (childIndex < parentNode.children.length - 1) {
                // Если есть следующий узел, активируем его
                nextActiveNodeId = parentNode.children[childIndex + 1].id;
            } else {
                // Если ни предыдущего, ни следующего узла нет, активируем родителя
                nextActiveNodeId = parentNode.id;
            }
            
            console.log(`DelActItemPlugin: следующий активный узел будет ${nextActiveNodeId}`);
            
            // Удаляем узел из массива дочерних элементов родителя
            parentNode.children.splice(childIndex, 1);
            
            console.log(`DelActItemPlugin: узел удален из массива дочерних элементов`);
            
            // Уведомляем об изменении дерева
            this.core.events.emit('treeUpdated', { nodeId: parentNode.id });
            this.core.events.emit('nodeDeleted', { nodeId, parentNodeId: parentNode.id });
            
            // Обновляем отображение дерева
            if (window.treeRenderer) {
                console.log(`DelActItemPlugin: обновляем отображение дерева`);
                window.treeRenderer.render();
            }
            
            // Активируем новый узел
            const activateItem = this.core.getModule('activateItem');
            if (activateItem && nextActiveNodeId) {
                console.log(`DelActItemPlugin: активируем узел ${nextActiveNodeId}`);
                activateItem.activateNode(nextActiveNodeId);
            }
            
            this.core.logger.log(`DelActItemPlugin: узел ${nodeId} успешно удален`);
            return true;
        } catch (error) {
            console.error('DelActItemPlugin: ошибка при удалении узла:', error);
            this.core.logger.log(`DelActItemPlugin: ошибка при удалении узла: ${error.message}`);
            alert(`Произошла ошибка при удалении: ${error.message}`);
            return false;
        }
    }

    /**
     * Подтверждение и удаление узла
     * @param {string} nodeId - ID узла для удаления
     */
    confirmAndDeleteNode(nodeId) {
        const node = this.findNodeById(nodeId);
        if (!node) {
            this.core.logger.log(`DelActItemPlugin: узел с ID ${nodeId} не найден`);
            alert('Узел не найден');
            return;
        }
        
        // Если у узла есть дочерние элементы, предупреждаем об их удалении
        let confirmMessage = `Вы уверены, что хотите удалить элемент "${node.text}"?`;
        if (node.children && node.children.length > 0) {
            confirmMessage = `Элемент "${node.text}" содержит ${node.children.length} дочерних элементов. Удалить вместе с дочерними элементами?`;
        }
        
        if (confirm(confirmMessage)) {
            this.deleteNode(nodeId);
        }
    }

    /**
     * Удаление активного узла
     */
    deleteActiveNode() {
        const activeNode = this.getActiveNode();
        if (!activeNode) {
            alert('Не выбран активный элемент для удаления');
            return;
        }
        
        this.confirmAndDeleteNode(activeNode.id);
    }
}

// Создание экземпляра плагина
const delActItemPlugin = new DelActItemPlugin();

// Экспорт для использования в других модулях
window.delActItemPlugin = delActItemPlugin;
