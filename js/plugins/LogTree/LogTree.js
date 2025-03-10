/**
 * LogTreePlugin - плагин для вывода структуры дерева в консоль
 * Позволяет визуализировать структуру дерева в консоли браузера
 */
class LogTreePlugin {
    constructor() {
        this.core = null;
    }

    init(core) {
        this.core = core;
        core.logger.log('LogTreePlugin: инициализирован');

        // Регистрация модуля для доступа к функциям логирования
        core.registerModule('logTree', {
            logTree: (format) => this.logTree(format),
            logNode: (nodeId, format) => this.logNode(nodeId, format),
            exportTreeJson: () => this.exportTreeJson()
        });

        // Подписка на события
        core.events.on('command', (data) => {
            if (data.command === 'logTree') {
                this.logTree(data.format);
            } else if (data.command === 'logNode' && data.nodeId) {
                this.logNode(data.nodeId, data.format);
            } else if (data.command === 'exportTreeJson') {
                this.exportTreeJson();
            }
        });
    }

    /**
     * Вывод всего дерева в консоль
     * @param {string} format - формат вывода ('json' или 'formatted')
     */
    logTree(format = 'json') {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('LogTreePlugin: не найден модуль treeManager');
            return;
        }

        const treeData = treeManager.getTreeData();
        this.core.logger.log('Структура дерева:');
        
        if (format === 'json') {
            // Вывод в JSON формате
            console.log('Дерево в JSON формате:');
            console.log(JSON.stringify(treeData, null, 2));
        } else {
            // Форматированный вывод
            console.group('Структура дерева');
            this.logNodeStructure(treeData, 0);
            console.groupEnd();
        }
        
        this.core.logger.log('Дерево выведено в консоль');
    }

    /**
     * Вывод конкретного узла и его потомков
     * @param {string} nodeId - ID узла
     * @param {string} format - формат вывода ('json' или 'formatted')
     */
    logNode(nodeId, format = 'json') {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('LogTreePlugin: не найден модуль treeManager');
            return;
        }

        const node = treeManager.findNodeById(nodeId);
        if (!node) {
            this.core.logger.log(`LogTreePlugin: узел с ID ${nodeId} не найден`);
            return;
        }

        this.core.logger.log(`Структура узла ${node.text}:`);
        
        if (format === 'json') {
            // Вывод в JSON формате
            console.log(`Узел в JSON формате:`);
            console.log(JSON.stringify(node, null, 2));
        } else {
            // Форматированный вывод
            console.group(`Узел: ${node.text} [${node.type}]`);
            this.logNodeStructure(node, 0);
            console.groupEnd();
        }
        
        this.core.logger.log('Узел выведен в консоль');
    }

    /**
     * Экспорт дерева в JSON и копирование в буфер обмена
     */
    exportTreeJson() {
        const treeManager = this.core.getModule('treeManager');
        if (!treeManager) {
            this.core.logger.log('LogTreePlugin: не найден модуль treeManager');
            return;
        }

        const treeData = treeManager.getTreeData();
        const jsonString = JSON.stringify(treeData, null, 2);
        
        // Вывод в консоль
        console.log('Дерево в JSON формате:');
        console.log(jsonString);
        
        // Попытка скопировать в буфер обмена
        try {
            navigator.clipboard.writeText(jsonString).then(() => {
                this.core.logger.log('JSON скопирован в буфер обмена');
            }).catch(err => {
                this.core.logger.log('Не удалось скопировать в буфер обмена: ' + err);
                console.error('Ошибка копирования:', err);
            });
        } catch (e) {
            this.core.logger.log('API буфера обмена недоступно');
            console.error('Ошибка доступа к буферу обмена:', e);
        }
        
        this.core.logger.log('Дерево экспортировано в JSON');
        return jsonString;
    }

    /**
     * Рекурсивный вывод структуры узла (форматированный)
     */
    logNodeStructure(node, level) {
        if (!node) return;

        const indent = '  '.repeat(level);
        const hasChildren = node.children && node.children.length > 0;
        
        // Получаем цвет для типа узла
        let typeColor = 'black';
        const typeManager = this.core.getModule('typeManager');
        if (typeManager) {
            typeColor = typeManager.getTypeColor(node.type) || 'black';
        }
        
        // Выводим информацию о узле с цветом
        console.log(
            `${indent}%c${node.text} %c[${node.type}] %cID: ${node.id}`, 
            `color: ${typeColor}; font-weight: bold`, 
            'color: gray', 
            'color: #0077aa'
        );

        // Выводим свойства узла, если они есть
        if (node.props) {
            console.group(`${indent}Свойства:`);
            for (const prop in node.props) {
                console.log(`${indent}  ${prop}: ${JSON.stringify(node.props[prop])}`);
            }
            console.groupEnd();
        }

        // Рекурсивно выводим дочерние узлы
        if (hasChildren) {
            console.group(`${indent}Дочерние узлы (${node.children.length}):`);
            node.children.forEach(child => {
                this.logNodeStructure(child, level + 1);
            });
            console.groupEnd();
        }
    }
}

// Создание экземпляра плагина
const logTreePlugin = new LogTreePlugin();

// Экспорт для использования в других модулях
window.logTreePlugin = logTreePlugin;
