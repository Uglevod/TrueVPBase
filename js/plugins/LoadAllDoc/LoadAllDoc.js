/**
 * LoadAllDocPlugin - плагин для загрузки дерева из JSON-файла
 * Позволяет загружать ранее сохраненную структуру дерева
 */
class LoadAllDocPlugin {
    constructor() {
        this.core = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('LoadAllDocPlugin: инициализирован');

        // Регистрация модуля
        core.registerModule('loadAllDoc', {
            loadTreeFromJson: (jsonData) => this.loadTreeFromJson(jsonData),
            openFileDialog: () => this.openFileDialog()
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'loadTreeFromJson') {
                this.loadTreeFromJson(data.jsonData);
            } else if (data.command === 'openLoadDialog') {
                this.openFileDialog();
            }
        });

        // Добавление кнопки в интерфейс
        this.addButtonToInterface();
        
        // Настройка горячих клавиш
        this.setupKeyboardShortcut();
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
                const loadButton = document.createElement('button');
                loadButton.className = 'btn btn-primary';
                loadButton.textContent = 'Загрузить дерево';
                loadButton.onclick = () => this.openFileDialog();
                buttonGroup.appendChild(loadButton);
            }
        }

        // Добавляем пункт в выпадающее меню Инструменты
        const toolsDropdown = document.querySelector('#navbarDropdown');
        if (toolsDropdown) {
            const dropdownMenu = toolsDropdown.nextElementSibling;
            if (dropdownMenu) {
                const menuItem = document.createElement('li');
                menuItem.innerHTML = '<a class="dropdown-item" href="#" onclick="coreApi.getModule(\'loadAllDoc\').openFileDialog()">Загрузить дерево из JSON</a>';
                
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
     * Настройка обработчика клавиатуры для Alt+S
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Alt+S (код клавиши S - 83) для загрузки файла
            if (e.altKey && e.keyCode === 83) {
                e.preventDefault(); // Отменяем стандартное действие браузера
                this.openFileDialog(); // Открываем диалог загрузки
            }
        });
    }

    /**
     * Открытие диалога выбора файла
     */
    openFileDialog() {
        // Создаем элемент input type="file"
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.style.display = 'none';
        
        // Добавляем обработчик события выбора файла
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const jsonData = event.target.result;
                    this.loadTreeFromJson(jsonData);
                } catch (error) {
                    this.core.logger.log(`LoadAllDocPlugin: ошибка чтения файла: ${error.message}`);
                    alert(`Ошибка чтения файла: ${error.message}`);
                }
            };
            
            reader.readAsText(file);
            
            // Удаляем элемент input после использования
            document.body.removeChild(fileInput);
        });
        
        // Добавляем элемент в DOM и симулируем клик
        document.body.appendChild(fileInput);
        fileInput.click();
    }

    /**
     * Загрузка дерева из JSON-строки
     * @param {string} jsonData - строка JSON с данными дерева
     * @returns {boolean} - успешность загрузки
     */
    loadTreeFromJson(jsonData) {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('LoadAllDocPlugin: не найден модуль treeManager');
            alert('Не удалось загрузить дерево: модуль управления деревом не найден');
            return false;
        }
        
        try {
            // Парсим JSON
            const treeData = JSON.parse(jsonData);
            console.log('Загруженные данные:', treeData);
            
            // Проверяем валидность структуры дерева
            if (!this.validateTreeData(treeData)) {
                this.core.logger.log('LoadAllDocPlugin: недопустимый формат данных дерева');
                alert('Недопустимый формат данных дерева');
                return false;
            }
            
            // Подтверждение перед загрузкой
            if (!confirm('Загрузка заменит текущее дерево. Продолжить?')) {
                return false;
            }
            
            // Сохраняем имя дерева для показа в уведомлении
            const treeName = treeData.text || 'без названия';
            
            // Сохраняем старое дерево для отладки
            const oldTreeData = window.treeData;
            console.log('Старое дерево:', oldTreeData);
            
            // Полностью заменяем дерево новыми данными
            console.log('Заменяем глобальную переменную treeData');
            window.treeData = treeData;
            
            // Принудительная синхронизация с treeManager
            console.log('Синхронизация с treeManager');
            
            // Обновляем treeManager напрямую
            if (typeof treeManager.setTreeData === 'function') {
                console.log('Вызываем treeManager.setTreeData');
                treeManager.setTreeData(treeData);
            } else {
                console.log('Метод setTreeData не найден, обновляем напрямую');
                // Прямое обновление свойств
                for (let prop in treeManager) {
                    if (prop === '_treeData' || prop === 'treeData') {
                        console.log(`Обновляем свойство treeManager.${prop}`);
                        treeManager[prop] = treeData;
                    }
                }
            }
            
            // Принудительное обновление рендерера
            if (window.treeRenderer) {
                console.log('Обновляем рендерер');
                
                // Полностью сбрасываем кэш рендерера
                if (typeof window.treeRenderer.resetCache === 'function') {
                    console.log('Сбрасываем кэш рендерера');
                    window.treeRenderer.resetCache();
                }
                
                // Очищаем DOM-элемент дерева
                const treeElement = document.getElementById('tree');
                if (treeElement) {
                    console.log('Очищаем DOM-элемент дерева');
                    treeElement.innerHTML = '';
                }
                
                // Инициализируем рендерер заново
                if (typeof window.treeRenderer.initialize === 'function') {
                    console.log('Инициализируем рендерер заново');
                    window.treeRenderer.initialize();
                }
                
                // Форсируем обновление
                console.log('Перерисовываем дерево');
                window.treeRenderer.render();
                
                // Для некоторых рендереров может потребоваться задержка
                setTimeout(() => {
                    console.log('Повторная отрисовка после задержки');
                    window.treeRenderer.render();
                }, 100);
            } else {
                console.log('Рендерер не найден');
            }
            
            // Проверяем, обновились ли данные
            console.log('Новое дерево в window.treeData:', window.treeData);
            
            // Уведомляем компоненты о замене дерева
            console.log('Отправляем события обновления');
            this.core.events.emit('treeLoaded', { treeData });
            this.core.events.emit('treeReplaced', { treeData });
            this.core.events.emit('treeUpdated', { nodeId: treeData.id, fullReplace: true });
            
            // Обновляем отображение с принудительной перезагрузкой страницы, если ничего не помогло
            const forceRefresh = () => {
                if (confirm('Для применения изменений требуется перезагрузка страницы. Перезагрузить сейчас?')) {
                    location.reload();
                }
            };
            
            // Проверяем видимость дерева после всех операций
            setTimeout(() => {
                const treeElement = document.getElementById('tree');
                if (treeElement && treeElement.children.length === 0) {
                    console.log('Дерево не отобразилось, предлагаем перезагрузку');
                    forceRefresh();
                }
            }, 500);
            
            // Сбрасываем и активируем корневой узел
            const activateItem = this.core.getModule('activateItem');
            if (activateItem) {
                console.log('Обновляем активный узел');
                if (typeof activateItem.deactivateAll === 'function') {
                    activateItem.deactivateAll();
                }
                activateItem.activateNode(treeData.id);
            }
            
            this.core.logger.log(`LoadAllDocPlugin: дерево "${treeName}" успешно загружено`);
            alert(`Дерево "${treeName}" успешно загружено`);
            
            return true;
        } catch (error) {
            this.core.logger.log(`LoadAllDocPlugin: ошибка загрузки дерева: ${error.message}`);
            console.error('Ошибка загрузки дерева:', error);
            alert(`Ошибка загрузки дерева: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Проверка формата JSON перед загрузкой
     * @param {object} data - данные дерева
     * @returns {boolean} - является ли структура допустимым деревом
     */
    validateTreeData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.id || !data.type) return false;
        
        const checkNode = (node) => {
            if (!node.id || !node.type || typeof node.text !== 'string') {
                return false;
            }
            
            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                    if (!checkNode(child)) return false;
                }
            }
            
            return true;
        };
        
        return checkNode(data);
    }
}

// Создание экземпляра плагина
const loadAllDocPlugin = new LoadAllDocPlugin();

// Экспорт для использования в других модулях
window.loadAllDocPlugin = loadAllDocPlugin;
