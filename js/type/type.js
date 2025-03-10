/**
 * TypeManager - плагин для управления типами объектов
 */
class TypeManager {
    constructor() {
        this.types = [];
        this.typeMap = new Map();
    }

    init(core) {
        // Инициализация типов из данных в init_types.js
        if (window.inital_types) {
            this.types = window.inital_types;
            
            // Создаем карту для быстрого доступа по имени типа
            this.types.forEach(type => {
                this.typeMap.set(type.type.toLowerCase(), type);
            });
            
            core.logger.log('TypeManager: инициализирован с ' + this.types.length + ' типами');
        } else {
            core.logger.log('TypeManager: не удалось найти данные типов');
        }

        // Регистрация в CoreAPI
        core.registerModule('typeManager', {
            getTypes: () => this.types,
            getTypeByName: (name) => this.getTypeByName(name),
            getTypeProps: (name) => this.getTypeProps(name),
            getTypeColor: (name) => this.getTypeColor(name),
            validateType: (typeName, data) => this.validateType(typeName, data)
        });

        // Подписка на события связанные с типами
        core.events.on('command', (data) => {
            if (data.command === 'listTypes') {
                this.listTypes(core);
            }
        });
    }

    /**
     * Получение типа по имени (регистронезависимо)
     */
    getTypeByName(typeName) {
        return this.typeMap.get(typeName.toLowerCase());
    }

    /**
     * Получение свойств типа
     */
    getTypeProps(typeName) {
        const type = this.getTypeByName(typeName);
        return type ? type.props || [] : [];
    }

    /**
     * Получение цвета для отображения типа
     */
    getTypeColor(typeName) {
        const type = this.getTypeByName(typeName);
        return type ? type.color : 'black';
    }

    /**
     * Проверка соответствия данных типу
     */
    validateType(typeName, data) {
        const type = this.getTypeByName(typeName);
        if (!type) return false;
        
        // Базовая проверка (можно расширить для более сложной валидации)
        if (type.props && data) {
            // Проверка требуемых свойств
            for (const propGroup of type.props) {
                for (const propName in propGroup) {
                    const prop = propGroup[propName];
                    if (prop.required && !data[propName]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Вывод списка доступных типов
     */
    listTypes(core) {
        core.logger.log('Доступные типы:');
        this.types.forEach(type => {
            core.logger.log(`- ${type.type}: ${type.description || 'Нет описания'} (цвет: ${type.color})`);
        });
    }
}

// Создание экземпляра плагина
const typeManager = new TypeManager();

// Экспорт для использования в других модулях
window.typeManager = typeManager;
