class HelloPlugin {
    init(core) {
        core.events.on('command', (data) => {
            if (data.command === 'test') {
                core.logger.log('Hello Plugin: Тестовая команда выполнена');
            }
        });
    }
}