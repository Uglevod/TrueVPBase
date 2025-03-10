/**
 * ChangeTypePlugin - плагин для изменения типа узлов дерева
 * Добавляет выдвижное меню типов слева и позволяет выбрать тип для активного элемента
 */
class ChangeTypePlugin {
    constructor() {
        this.core = null;
        this.typesList = [];
        this.menuElement = null;
        this.menuOpen = false;
    }

    init(core) {
        this.core = core;
        core.logger.log('ChangeTypePlugin: инициализирован');

        // Регистрация модуля для доступа к функциям изменения типа
        core.registerModule('changeType', {
            changeNodeType: (nodeId, newType) => this.changeNodeType(nodeId, newType),
            toggleTypeMenu: () => this.toggleTypeMenu()
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'changeNodeType') {
                this.changeNodeType(data.nodeId, data.newType);
            } else if (data.command === 'toggleTypeMenu') {
                this.toggleTypeMenu();
            }
        });

        // Загрузка типов и создание меню
        this.loadTypes();
        this.createTypeMenu();
        
        // Добавляем кнопку для открытия меню на панель
        this.addToggleButton();
        
        // Настройка горячих клавиш
        this.setupKeyboardShortcut();
    }

    /**
     * Загрузка типов из модуля type
     */
    loadTypes() {
        // Получаем типы из глобальной переменной или из модуля типов
        if (window.inital_types) {
            this.typesList = window.inital_types;
        } else if (this.core.getModule('typeManager')) {
            const typeManager = this.core.getModule('typeManager');
            if (typeManager && typeManager.getTypes) {
                this.typesList = typeManager.getTypes();
            }
        }
        
        this.core.logger.log(`Загружено типов: ${this.typesList.length}`);
    }

    /**
     * Создание выдвижного меню типов
     */
    createTypeMenu() {
        // Создаем основной контейнер меню
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'type-menu';
        this.menuElement.innerHTML = `
            <div class="type-menu-header">
                <h3>Типы элементов</h3>
                <button class="type-menu-close">&times;</button>
            </div>
            <div class="type-menu-content">
                <ul class="type-list"></ul>
            </div>
        `;
        
        // Добавляем стили для меню
        const style = document.createElement('style');
        style.textContent = `
            .type-menu {
                position: fixed;
                top: 0;
                left: -250px;
                width: 250px;
                height: 100%;
                background-color: #f8f9fa;
                box-shadow: 2px 0 5px rgba(0,0,0,0.2);
                transition: left 0.3s ease;
                z-index: 1000;
                overflow-y: auto;
            }
            .type-menu.open {
                left: 0;
            }
            .type-menu-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background-color: #343a40;
                color: white;
            }
            .type-menu-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
            }
            .type-menu-content {
                padding: 15px;
            }
            .type-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .type-item {
                padding: 8px 10px;
                margin-bottom: 5px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
            }
            .type-item:hover {
                background-color: #e9ecef;
            }
            .type-color {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                margin-right: 10px;
            }
            .type-toggle-btn {
                position: fixed;
                left: 10px;
                top: 70px;
                z-index: 999;
                background-color: #343a40;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        
        // Добавляем меню в DOM
        document.body.appendChild(this.menuElement);
        
        // Заполняем список типов
        this.populateTypeList();
        
        // Добавляем обработчик закрытия меню
        const closeBtn = this.menuElement.querySelector('.type-menu-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleTypeMenu(false));
        }
    }

    /**
     * Заполнение списка типов
     */
    populateTypeList() {
        const typeList = this.menuElement.querySelector('.type-list');
        if (!typeList || !this.typesList.length) return;
        
        // Очищаем текущий список
        typeList.innerHTML = '';
        
        // Добавляем типы в список
        this.typesList.forEach(type => {
            const typeItem = document.createElement('li');
            typeItem.className = 'type-item';
            typeItem.setAttribute('data-type', type.type);
            typeItem.innerHTML = `
                <span class="type-color" style="background-color: ${type.color}"></span>
                <span class="type-name">${type.type}</span>
            `;
            
            // Добавляем обработчик клика для изменения типа
            typeItem.addEventListener('click', () => {
                const activateItem = this.core.getModule('activateItem');
                if (activateItem) {
                    const activeNodeId = activateItem.getActiveNodeId();
                    if (activeNodeId) {
                        this.changeNodeType(activeNodeId, type.type);
                    } else {
                        this.core.logger.log('Нет активного элемента для изменения типа');
                    }
                }
            });
            
            typeList.appendChild(typeItem);
        });
    }

    /**
     * Добавление кнопки для открытия/закрытия меню
     */
    addToggleButton() {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'type-toggle-btn';
        toggleBtn.textContent = 'Типы';
        toggleBtn.addEventListener('click', () => this.toggleTypeMenu());
        
        document.body.appendChild(toggleBtn);
    }

    /**
     * Открытие/закрытие меню типов
     * @param {boolean} open - флаг открытия (если не указан, то переключает состояние)
     */
    toggleTypeMenu(open) {
        if (open === undefined) {
            this.menuOpen = !this.menuOpen;
        } else {
            this.menuOpen = open;
        }
        
        if (this.menuElement) {
            if (this.menuOpen) {
                this.menuElement.classList.add('open');
            } else {
                this.menuElement.classList.remove('open');
            }
        }
    }

    /**
     * Изменение типа узла
     * @param {string} nodeId - ID узла
     * @param {string} newType - новый тип
     */
    changeNodeType(nodeId, newType) {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('ChangeTypePlugin: не найден модуль treeManager');
            return false;
        }
        
        const node = treeManager.findNodeById(nodeId);
        if (!node) {
            this.core.logger.log(`ChangeTypePlugin: узел с ID ${nodeId} не найден`);
            return false;
        }
        
        // Сохраняем старый тип для логирования
        const oldType = node.type;
        
        // Изменяем тип узла
        node.type = newType;
        
        this.core.logger.log(`Тип узла изменен: "${oldType}" -> "${newType}"`);
        
        // Вызываем событие для обновления дерева
        this.core.events.emit('treeUpdated', { nodeId });
        this.core.events.emit('nodeTypeChanged', { 
            nodeId, 
            oldType, 
            newType 
        });
        
        // Обновляем отображение дерева
        if (window.treeRenderer) {
            window.treeRenderer.render();
        }
        
        return true;
    }

    /**
     * Настройка обработчика клавиатуры для Alt+T
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Alt+T (код клавиши T - 84)
            if (e.altKey && e.keyCode === 84) {
                e.preventDefault(); // Отменяем стандартное действие браузера
                this.toggleTypeMenu(); // Открываем/закрываем меню типов
            }
        });
    }
}

// Создание экземпляра плагина
const changeTypePlugin = new ChangeTypePlugin();

// Экспорт для использования в других модулях
window.changeTypePlugin = changeTypePlugin;
