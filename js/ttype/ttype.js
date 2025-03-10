/**
 * TTypeManager - модуль для управления типами ttype
 * Предоставляет информацию о цветах в зависимости от параметра ttype
 */
class TTypeManager {
    constructor() {
        this.ttypes = [];
        this.ttypeMap = new Map();
    }

    init(core) {
        // Инициализация данными из init_ttype.js
        if (window.init_ttype) {
            this.ttypes = window.init_ttype;
            
            // Создаем карту для быстрого доступа по имени ttype
            this.ttypes.forEach(ttype => {
                this.ttypeMap.set(ttype.ttype.toLowerCase(), ttype);
            });
            
            core.logger.log('TTypeManager: инициализирован с ' + this.ttypes.length + ' типами ttype');
        } else {
            core.logger.log('TTypeManager: не удалось найти данные ttype');
        }

        // Регистрация в CoreAPI
        core.registerModule('ttypeManager', {
            getTTypes: () => this.ttypes,
            getTTypeByName: (name) => this.getTTypeByName(name),
            getColorByTType: (name) => this.getColorByTType(name)
        });

        // Подписка на события связанные с ttypes
        core.events.on('command', (data) => {
            if (data.command === 'listTTypes') {
                this.listTTypes(core);
            }
        });
    }

    /**
     * Получение типа ttype по имени (регистронезависимо)
     */
    getTTypeByName(ttypeName) {
        return this.ttypeMap.get(ttypeName ? ttypeName.toLowerCase() : '');
    }

    /**
     * Получение цвета для ttype
     * @param {string} ttypeName - имя ttype
     * @returns {string} - цвет в формате CSS (например, 'black', 'red', '#FF0000')
     */
    getColorByTType(ttypeName) {
        const ttype = this.getTTypeByName(ttypeName);
        return ttype ? ttype.color : 'black'; // черный по умолчанию
    }

    /**
     * Вывод списка доступных ttype и их цветов
     */
    listTTypes(core) {
        core.logger.log('Доступные ttype:');
        this.ttypes.forEach(ttype => {
            core.logger.log(`- ${ttype.ttype}: цвет: ${ttype.color}`);
        });
    }
}

// Создание экземпляра 
const ttypeManager = new TTypeManager();

// Экспорт для использования в других модулях
window.ttypeManager = ttypeManager;
