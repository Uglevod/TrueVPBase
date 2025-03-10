class MathPlugin {
    init(core) {
        core.registerModule('math', {
            add: (a, b) => a + b,
            multiply: (a, b) => a * b
        });

        core.events.on('command', (data) => {
            if (data.command === 'math') {
                const math = core.getModule('math');
                const result = math.add(5, 3);
                core.logger.log(`Math Plugin: 5 + 3 = ${result}`);
            }
        });
    }
}