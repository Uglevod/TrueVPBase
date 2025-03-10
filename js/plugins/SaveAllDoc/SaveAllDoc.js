/**
 * SaveAllDocPlugin - плагин для сохранения всего дерева в JSON-файл
 * Имя файла генерируется на основе текста корневого элемента
 */
class SaveAllDocPlugin {
    constructor() {
        this.core = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('SaveAllDocPlugin: инициализирован');

        // Регистрация модуля
        core.registerModule('saveAllDoc', {
            saveTreeToJson: () => this.saveTreeToJson(),
            downloadTreeAsJson: () => this.downloadTreeAsJson()
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'saveTreeToJson') {
                this.saveTreeToJson();
            } else if (data.command === 'downloadTreeAsJson') {
                this.downloadTreeAsJson();
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
                const saveButton = document.createElement('button');
                saveButton.className = 'btn btn-success';
                saveButton.textContent = 'Сохранить дерево';
                saveButton.onclick = () => this.downloadTreeAsJson();
                buttonGroup.appendChild(saveButton);
            }
        }

        // Добавляем пункт в выпадающее меню Инструменты
        const toolsDropdown = document.querySelector('#navbarDropdown');
        if (toolsDropdown) {
            const dropdownMenu = toolsDropdown.nextElementSibling;
            if (dropdownMenu) {
                const menuItem = document.createElement('li');
                menuItem.innerHTML = '<a class="dropdown-item" href="#" onclick="coreApi.getModule(\'saveAllDoc\').downloadTreeAsJson()">Сохранить дерево в JSON</a>';
                
                // Находим соответствующее место в меню (после "Экспорт дерева")
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

    /**
     * Настройка обработчика клавиатуры для Ctrl+S
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S (код клавиши S - 83)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) {
                e.preventDefault(); // Отменяем стандартное действие браузера (сохранение страницы)
                this.downloadTreeAsJson(); // Сохраняем дерево в JSON
            }
        });
    }

    /**
     * Получение текста корневого элемента для имени файла
     * @returns {string} - текст корневого элемента или значение по умолчанию
     */
    getRootText() {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) return 'tree';
        
        const rootNode = treeManager.getTreeData();
        if (!rootNode || !rootNode.text) return 'tree';
        
        // Очищаем текст от недопустимых символов в имени файла
        let filename = rootNode.text
            .replace(/[/\\?%*:|"<>]/g, '_') // Заменяем недопустимые символы на подчеркивание
            .trim();
            
        return filename || 'tree';
    }

    /**
     * Сохранение дерева в JSON-строку
     * @returns {string} - строка JSON с данными дерева
     */
    saveTreeToJson() {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('SaveAllDocPlugin: не найден модуль treeManager');
            return null;
        }
        
        try {
            const treeData = treeManager.getTreeData();
            if (!treeData) {
                this.core.logger.log('SaveAllDocPlugin: дерево пустое');
                return null;
            }
            
            // Преобразуем в JSON с отступами для удобочитаемости
            const jsonData = JSON.stringify(treeData, null, 2);
            this.core.logger.log('SaveAllDocPlugin: дерево успешно сохранено в JSON');
            
            return jsonData;
        } catch (error) {
            this.core.logger.log(`SaveAllDocPlugin: ошибка при сохранении дерева: ${error.message}`);
            console.error('Ошибка сохранения дерева:', error);
            return null;
        }
    }

    /**
     * Скачивание дерева как JSON-файл
     */
    downloadTreeAsJson() {
        const jsonData = this.saveTreeToJson();
        if (!jsonData) {
            alert('Не удалось сохранить дерево. Проверьте консоль для деталей.');
            return;
        }
        
        // Получаем имя файла на основе текста корневого элемента
        const fileName = this.getRootText() + '.json';
        
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
        
        this.core.logger.log(`SaveAllDocPlugin: файл ${fileName} успешно сохранен`);
    }

    /**
     * Копирование дерева в буфер обмена (доп. функция)
     */
    copyTreeToClipboard() {
        const jsonData = this.saveTreeToJson();
        if (!jsonData) {
            alert('Не удалось скопировать дерево. Проверьте консоль для деталей.');
            return;
        }
        
        // Копируем в буфер обмена
        navigator.clipboard.writeText(jsonData)
            .then(() => {
                this.core.logger.log('SaveAllDocPlugin: дерево скопировано в буфер обмена');
                alert('Дерево скопировано в буфер обмена');
            })
            .catch(err => {
                this.core.logger.log(`SaveAllDocPlugin: ошибка копирования в буфер обмена: ${err.message}`);
                alert('Ошибка копирования в буфер обмена');
                console.error('Ошибка копирования:', err);
            });
    }
}

// Создание экземпляра плагина
const saveAllDocPlugin = new SaveAllDocPlugin();

// Экспорт для использования в других модулях
window.saveAllDocPlugin = saveAllDocPlugin;
