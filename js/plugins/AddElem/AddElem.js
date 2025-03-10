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
 * AddElemPlugin - плагин для добавления элементов в дерево
 */
class AddElemPlugin {
    constructor() {
        this.core = null;
        // Удаляем счетчик ID, так как теперь будем использовать UUID
        // this.nextId = 1000;
    }

    init(core) {
        this.core = core;
        core.logger.log('AddElemPlugin: инициализирован');

        // Регистрация модуля для доступа к функциям плагина
        core.registerModule('addElem', {
            addElement: (type, text, parentId, options) => this.addElement(type, text, parentId, options),
            addElementToParent: (parentId, type, text, options) => this.addElementToParent(parentId, type, text, options)
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'addElement') {
                this.addElement(data.type, data.text, data.parentId, data.options);
            } else if (data.command === 'addElementToParent') {
                this.addElementToParent(data.parentId, data.type, data.text, data.options);
            }
        });

        // Добавление кнопки в интерфейс
        this.addButtonToInterface();
        
        // Настройка горячих клавиш
        this.setupKeyboardShortcut();

        // Добавление пунктов в контекстное меню
        this.addContextMenuItems();
    }

    /**
     * Добавление кнопки в интерфейс
     */
    addButtonToInterface() {
        // Добавляем кнопку в секцию ДопФункции
        const extraFunctionsSection = document.getElementById('extraFunctionsSection');
        if (extraFunctionsSection) {
            const buttonGroup = extraFunctionsSection.querySelector('.btn-group');
            if (buttonGroup) {
                const addButton = document.createElement('button');
                addButton.className = 'btn btn-primary';
                addButton.textContent = 'Добавить элемент';
                addButton.onclick = () => this.showAddElementDialog();
                buttonGroup.appendChild(addButton);
            }
        }

        // Добавляем пункт в выпадающее меню Инструменты
        const toolsDropdown = document.querySelector('#navbarDropdown');
        if (toolsDropdown) {
            const dropdownMenu = toolsDropdown.nextElementSibling;
            if (dropdownMenu) {
                const menuItem = document.createElement('li');
                menuItem.innerHTML = '<a class="dropdown-item" href="#" onclick="coreApi.getModule(\'addElem\').showAddElementDialog()">Добавить элемент</a>';
                dropdownMenu.appendChild(menuItem);
            }
        }
    }

    /**
     * Показать диалог добавления элемента
     */
    showAddElementDialog() {
        // Создаем модальное окно для добавления элемента
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'addElementModal';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'addElementModalLabel');
        modal.setAttribute('aria-hidden', 'true');

        // Получаем список доступных типов
        const typeManager = this.core.getModule('typeManager');
        let typeOptions = '';
        if (typeManager) {
            const types = typeManager.getTypes();
            types.forEach(type => {
                typeOptions += `<option value="${type.type}">${type.type}</option>`;
            });
        } else {
            typeOptions = '<option value="folder">folder</option><option value="item">item</option>';
        }

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addElementModalLabel">Добавить новый элемент</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="mb-3">
                                <label for="elementType" class="form-label">Тип элемента</label>
                                <select class="form-select" id="elementType">
                                    ${typeOptions}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="elementText" class="form-label">Текст элемента</label>
                                <input type="text" class="form-control" id="elementText" placeholder="Введите текст">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="saveElementBtn">Добавить</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Инициализируем модальное окно Bootstrap
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        // Обработчик кнопки добавления
        document.getElementById('saveElementBtn').addEventListener('click', () => {
            const type = document.getElementById('elementType').value;
            const text = document.getElementById('elementText').value;
            
            if (text.trim()) {
                this.addElement(type, text);
                modalInstance.hide();
                
                // Удаляем модальное окно из DOM после закрытия
                modal.addEventListener('hidden.bs.modal', function () {
                    document.body.removeChild(modal);
                });
            }
        });

        // Удаляем модальное окно из DOM после закрытия
        modal.addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modal);
        });
    }

    /**
     * Добавление элемента в дерево
     * @param {string} type - тип элемента
     * @param {string} text - текст элемента
     * @param {string} parentId - ID родительского узла
     * @param {object} options - дополнительные опции
     * @returns {object|null} - добавленный элемент или null в случае ошибки
     */
    addElement(type, text, parentId, options = {}) {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('AddElemPlugin: не найден модуль treeManager');
            return null;
        }

        // Если parentId не указан, используем Root или активный элемент
        if (!parentId) {
            const activateItem = this.core.getModule('activateItem');
            if (activateItem) {
                parentId = activateItem.getActiveNodeId();
            }
            
            if (!parentId) {
                const rootNode = treeManager.getTreeData();
                if (rootNode) {
                    parentId = rootNode.id;
                }
            }
        }

        if (!parentId) {
            this.core.logger.log('AddElemPlugin: не указан родитель и не удалось его определить');
            return null;
        }

        // Находим родительский узел
        const parentNode = treeManager.findNodeById(parentId);
        if (!parentNode) {
            this.core.logger.log(`AddElemPlugin: родительский узел с ID ${parentId} не найден`);
            return null;
        }

        // Генерируем UUID для нового элемента
        const newId = generateUUID();
        
        // Создаем новый элемент
        const newElement = {
            id: newId,
            type: type || 'Def',
            text: text || 'Новый элемент',
            children: []
        };

        // Добавляем дополнительные свойства, если они указаны
        if (options.props) {
            newElement.props = options.props;
        }

        // Если у родительского узла нет массива children, создаем его
        if (!parentNode.children) {
            parentNode.children = [];
        }

        // Добавляем элемент к родителю
        parentNode.children.push(newElement);

        this.core.logger.log(`Добавлен элемент с ID ${newId} типа ${type} к родителю ${parentId}`);
        
        // Вызываем событие обновления дерева
        this.core.events.emit('treeUpdated', { nodeId: newId });
        
        // Активируем новый элемент
        if (options.activate !== false) {
            const activateItem = this.core.getModule('activateItem');
            if (activateItem && typeof activateItem.activateNode === 'function') {
                activateItem.activateNode(newId);
            } else {
                this.core.events.emit('activateNode', { nodeId: newId });
            }
        }
        
        // Раскрываем узлы по пути от корня до нового элемента
        if (window.treeRenderer) {
            window.treeRenderer.expandNodeAndParents(parentId);
        }
        
        return newElement;
    }

    /**
     * Добавление элемента к указанному родителю
     * @param {string} parentId - ID родительского узла
     * @param {string} type - тип элемента
     * @param {string} text - текст элемента
     * @param {object} options - дополнительные опции
     * @returns {object|null} - добавленный элемент или null в случае ошибки
     */
    addElementToParent(parentId, type, text, options = {}) {
        return this.addElement(type, text, parentId, options);
    }

    /**
     * Настройка обработчика клавиатуры для Alt+A
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Alt+A (код клавиши A - 65)
            if (e.altKey && e.keyCode === 65) {
                e.preventDefault(); // Отменяем стандартное действие браузера
                this.quickAddElement(); // Быстрое добавление элемента без диалога
            }
        });
    }

    /**
     * Быстрое добавление элемента типа "Def" с текстом "Новый элемент"
     */
    quickAddElement() {
        // Добавляем элемент типа "Def" с текстом "Новый элемент"
        const newElement = this.addElement("Def", "Новый элемент");
        
        if (newElement) {
            this.core.logger.log(`Быстрое добавление: создан элемент типа "Def" с ID ${newElement.id}`);
        } else {
            this.core.logger.log('Не удалось быстро добавить элемент');
        }
        
        return newElement;
    }

    /**
     * Добавление пунктов в контекстное меню
     */
    addContextMenuItems() {
        // Проверка наличия модуля контекстного меню
        const contextMenu = this.core.getModule('contextMenu');
        if (!contextMenu) return;

        // Добавление пунктов меню для разных типов элементов
        contextMenu.addMenuItem('all', {
            id: 'addFolder',
            text: 'Добавить папку',
            action: (nodeId) => {
                this.addElementToParent(nodeId, 'Folder', 'Новая папка');
            }
        });
        
        contextMenu.addMenuItem('all', {
            id: 'addElement',
            text: 'Добавить элемент',
            action: (nodeId) => {
                this.addElementToParent(nodeId, 'Def', 'Новый элемент');
            }
        });
        
        // Добавление подменю с типами
        if (window.inital_types) {
            const typeSubmenu = {
                id: 'addByType',
                text: 'Добавить по типу',
                submenu: []
            };
            
            window.inital_types.forEach(typeInfo => {
                if (typeInfo.type !== 'Root') {  // Исключаем корневой тип
                    typeSubmenu.submenu.push({
                        id: `add_${typeInfo.type}`,
                        text: `${typeInfo.type}`,
                        action: (nodeId) => {
                            this.addElementToParent(nodeId, typeInfo.type, `Новый ${typeInfo.type}`);
                        }
                    });
                }
            });
            
            contextMenu.addMenuItem('all', typeSubmenu);
        }
    }
}

// Создание экземпляра плагина
const addElemPlugin = new AddElemPlugin();

// Экспорт для использования в других модулях
window.addElemPlugin = addElemPlugin;
