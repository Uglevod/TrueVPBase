/**
 * SaveActiveChildPlugin - плагин для сохранения дочерних элементов активного узла в JSON-файл
 * Имя файла генерируется на основе текста активного элемента
 */
class SaveActiveChildPlugin {
    constructor() {
        this.core = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('SaveActiveChildPlugin: инициализирован');

        // Регистрация модуля
        core.registerModule('saveActiveChild', {
            saveActiveChildToJson: () => this.saveActiveChildToJson(),
            downloadActiveChildAsJson: () => this.downloadActiveChildAsJson()
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'saveActiveChildToJson') {
                this.saveActiveChildToJson();
            } else if (data.command === 'downloadActiveChildAsJson') {
                this.downloadActiveChildAsJson();
            }
        });

        // Добавление пункта в меню Инструменты
        this.addMenuItemToInterface();
    }

    /**
     * Добавление пункта в меню Инструменты
     */
    addMenuItemToInterface() {
        // Добавляем пункт в выпадающее меню Инструменты
        const toolsDropdown = document.querySelector('#navbarDropdown');
        if (toolsDropdown) {
            const dropdownMenu = toolsDropdown.nextElementSibling;
            if (dropdownMenu) {
                const menuItem = document.createElement('li');
                menuItem.innerHTML = '<a class="dropdown-item" href="#" onclick="coreApi.getModule(\'saveActiveChild\').downloadActiveChildAsJson()">Сохранить дочерние узлы активного элемента</a>';
                
                // Находим соответствующее место в меню (после "Сохранить дерево в JSON")
                const saveMenuItem = Array.from(dropdownMenu.querySelectorAll('.dropdown-item')).find(item => 
                    item.textContent.includes('Сохранить дерево в JSON')
                );
                
                if (saveMenuItem) {
                    saveMenuItem.parentNode.insertBefore(menuItem, saveMenuItem.nextSibling);
                } else {
                    // Или после "Экспорт дерева", если пункт "Сохранить дерево в JSON" не найден
                    const exportMenuItem = Array.from(dropdownMenu.querySelectorAll('.dropdown-item')).find(item => 
                        item.textContent.includes('Экспорт дерева')
                    );
                    
                    if (exportMenuItem) {
                        exportMenuItem.parentNode.insertBefore(menuItem, exportMenuItem.nextSibling);
                    } else {
                        dropdownMenu.appendChild(menuItem);
                    }
                }
            }
        }
    }

    /**
     * Получение активного узла
     * @returns {object|null} - активный узел или null, если активный узел не найден
     */
    getActiveNode() {
        const activateItem = this.core.getModule('activateItem');
        if (!activateItem) {
            this.core.logger.log('SaveActiveChildPlugin: не найден модуль activateItem');
            return null;
        }
        
        const activeNodeId = activateItem.getActiveNodeId();
        if (!activeNodeId) {
            this.core.logger.log('SaveActiveChildPlugin: нет активного узла');
            return null;
        }
        
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('SaveActiveChildPlugin: не найден модуль treeManager');
            return null;
        }
        
        const activeNode = treeManager.findNodeById(activeNodeId);
        if (!activeNode) {
            this.core.logger.log(`SaveActiveChildPlugin: не найден узел с ID ${activeNodeId}`);
            return null;
        }
        
        return activeNode;
    }

    /**
     * Создание копии узла с дочерними элементами
     * @param {object} node - исходный узел
     * @returns {object} - копия узла
     */
    cloneNode(node) {
        if (!node) return null;
        
        // Создаем копию узла без дочерних элементов
        const nodeCopy = { ...node };
        
        // Копируем дочерние элементы, если они есть
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
            nodeCopy.children = node.children.map(child => this.cloneNode(child));
        } else {
            nodeCopy.children = [];
        }
        
        return nodeCopy;
    }

    /**
     * Получение текста активного узла для имени файла
     * @returns {string} - текст активного узла или значение по умолчанию
     */
    getActiveNodeText() {
        const activeNode = this.getActiveNode();
        if (!activeNode || !activeNode.text) return 'subtree';
        
        // Очищаем текст от недопустимых символов в имени файла
        let filename = activeNode.text
            .replace(/[/\\?%*:|"<>]/g, '_') // Заменяем недопустимые символы на подчеркивание
            .trim();
            
        return filename || 'subtree';
    }

    /**
     * Создание поддерева из активного узла
     * @returns {object|null} - объект с данными поддерева или null в случае ошибки
     */
    createSubtree() {
        const activeNode = this.getActiveNode();
        if (!activeNode) {
            alert('Не выбран активный узел для сохранения');
            return null;
        }
        
        // Если у активного узла нет дочерних элементов
        if (!activeNode.children || activeNode.children.length === 0) {
            alert('У активного узла нет дочерних элементов для сохранения');
            return null;
        }
        
        // Создаем корневой элемент поддерева на основе активного узла
        const subtree = this.cloneNode(activeNode);
        
        return subtree;
    }

    /**
     * Сохранение дочерних элементов активного узла в JSON-строку
     * @returns {string|null} - строка JSON с данными поддерева или null в случае ошибки
     */
    saveActiveChildToJson() {
        try {
            const subtree = this.createSubtree();
            if (!subtree) {
                return null;
            }
            
            // Преобразуем в JSON с отступами для удобочитаемости
            const jsonData = JSON.stringify(subtree, null, 2);
            this.core.logger.log('SaveActiveChildPlugin: дочерние элементы активного узла успешно сохранены в JSON');
            
            return jsonData;
        } catch (error) {
            this.core.logger.log(`SaveActiveChildPlugin: ошибка при сохранении: ${error.message}`);
            console.error('Ошибка сохранения дочерних элементов:', error);
            return null;
        }
    }

    /**
     * Скачивание дочерних элементов активного узла как JSON-файл
     */
    downloadActiveChildAsJson() {
        const jsonData = this.saveActiveChildToJson();
        if (!jsonData) {
            alert('Не удалось сохранить дочерние элементы. Проверьте, выбран ли узел и есть ли у него дочерние элементы.');
            return;
        }
        
        // Получаем имя файла на основе текста активного узла
        const fileName = this.getActiveNodeText() + '_children.json';
        
        // Создаем ссылку для скачивания
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        // Добавляем ссылку в DOM и симулируем клик
        document.body.appendChild(link);
        link.click();
        
        // Удаляем ссылку из DOM и освобождаем URL
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        this.core.logger.log(`SaveActiveChildPlugin: файл ${fileName} успешно сохранен`);
    }
}

// Создание экземпляра плагина
const saveActiveChildPlugin = new SaveActiveChildPlugin();

// Экспорт для использования в других модулях
window.saveActiveChildPlugin = saveActiveChildPlugin;
